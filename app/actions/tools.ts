'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchGSCRows } from '@/lib/tools-gsc'

// ── Shared helper ─────────────────────────────────────────────────────────────

async function getClientGSCUrl(clientId: string): Promise<string> {
  const service = await createServiceClient()
  const { data } = await service
    .from('clients')
    .select('gsc_site_url, name')
    .eq('id', clientId)
    .single()
  if (!data?.gsc_site_url) {
    throw new Error(
      `No Search Console site configured for ${data?.name ?? 'this client'}. Set it in client settings.`
    )
  }
  return data.gsc_site_url
}

// ── Keyword Quick Wins ────────────────────────────────────────────────────────

export type QuickWin = {
  query: string
  page: string
  position: number
  impressions: number
  clicks: number
  ctr: number
  estimatedClicksAt5: number
  estimatedClicksAt3: number
  opportunityScore: number
}

export async function fetchQuickWins(clientId: string): Promise<{
  wins?: QuickWin[]
  error?: string
}> {
  try {
    await requireAdmin()
    const siteUrl = await getClientGSCUrl(clientId)
    const rows = await fetchGSCRows(siteUrl, 90)

    const wins: QuickWin[] = rows
      .filter(
        (r) =>
          r.position >= 4 &&
          r.position <= 20 &&
          r.impressions >= 100
      )
      .map((r) => {
        const estimatedClicksAt5 = Math.round(r.impressions * 0.065)
        const estimatedClicksAt3 = Math.round(r.impressions * 0.103)
        const opportunityScore = Math.round(
          (estimatedClicksAt3 - r.clicks) * (1 / r.position) * 100
        )
        return {
          query: r.query,
          page: r.page,
          position: Math.round(r.position * 10) / 10,
          impressions: r.impressions,
          clicks: r.clicks,
          ctr: Math.round(r.ctr * 10) / 10,
          estimatedClicksAt5,
          estimatedClicksAt3,
          opportunityScore,
        }
      })
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 50)

    return { wins }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to fetch quick wins' }
  }
}

// ── AI Visibility Checker ─────────────────────────────────────────────────────

export type AIVisibilityResult = {
  domain: string
  brandedClicks: number
  brandedImpressions: number
  totalClicks: number
  totalImpressions: number
  brandedClickShare: number
  brandedImpressionShare: number
  topBrandedQueries: { query: string; clicks: number; impressions: number; position: number }[]
  topNonBrandedQueries: { query: string; clicks: number; impressions: number; position: number }[]
  periodDays: number
}

export async function checkAIVisibility(clientId: string): Promise<{
  result?: AIVisibilityResult
  error?: string
}> {
  try {
    await requireAdmin()
    const service = await createServiceClient()
    const { data: client } = await service
      .from('clients')
      .select('gsc_site_url, name, slug')
      .eq('id', clientId)
      .single()

    if (!client?.gsc_site_url) {
      throw new Error('No Search Console site configured. Set it in client settings.')
    }

    const rows = await fetchGSCRows(client.gsc_site_url, 90)

    const siteHost = client.gsc_site_url
      .replace('sc-domain:', '')
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .split('.')[0]

    const brandTerms = [
      client.slug.toLowerCase(),
      siteHost.toLowerCase(),
      client.name.toLowerCase(),
    ].filter(Boolean)

    const isBranded = (query: string) =>
      brandTerms.some((term) => query.toLowerCase().includes(term))

    const branded = rows.filter((r) => isBranded(r.query))
    const nonBranded = rows.filter((r) => !isBranded(r.query))

    const sum = (arr: typeof rows, key: keyof (typeof rows)[0]) =>
      arr.reduce((acc, r) => acc + (r[key] as number), 0)

    const brandedClicks = sum(branded, 'clicks')
    const brandedImpressions = sum(branded, 'impressions')
    const totalClicks = sum(rows, 'clicks')
    const totalImpressions = sum(rows, 'impressions')

    const aggregateByQuery = (arr: typeof rows) => {
      const map = new Map<string, { clicks: number; impressions: number; position: number; count: number }>()
      for (const r of arr) {
        const prev = map.get(r.query) ?? { clicks: 0, impressions: 0, position: 0, count: 0 }
        map.set(r.query, {
          clicks: prev.clicks + r.clicks,
          impressions: prev.impressions + r.impressions,
          position: prev.position + r.position,
          count: prev.count + 1,
        })
      }
      return Array.from(map.entries())
        .map(([query, v]) => ({
          query,
          clicks: v.clicks,
          impressions: v.impressions,
          position: Math.round((v.position / v.count) * 10) / 10,
        }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10)
    }

    return {
      result: {
        domain: client.gsc_site_url,
        brandedClicks,
        brandedImpressions,
        totalClicks,
        totalImpressions,
        brandedClickShare: totalClicks > 0 ? Math.round((brandedClicks / totalClicks) * 100) : 0,
        brandedImpressionShare: totalImpressions > 0 ? Math.round((brandedImpressions / totalImpressions) * 100) : 0,
        topBrandedQueries: aggregateByQuery(branded),
        topNonBrandedQueries: aggregateByQuery(nonBranded),
        periodDays: 90,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to check AI visibility' }
  }
}

// ── Content Gap Finder ────────────────────────────────────────────────────────

export type ContentGap = {
  query: string
  impressions: number
  clicks: number
  position: number
  ctr: number
  gapType: 'high-impression-no-clicks' | 'ranking-but-weak' | 'near-page-one'
  recommendation: string
}

export async function fetchContentGaps(clientId: string): Promise<{
  gaps?: ContentGap[]
  error?: string
}> {
  try {
    await requireAdmin()
    const siteUrl = await getClientGSCUrl(clientId)
    const rows = await fetchGSCRows(siteUrl, 90)

    const queryMap = new Map<string, {
      impressions: number; clicks: number; position: number; count: number
    }>()
    for (const r of rows) {
      const prev = queryMap.get(r.query) ?? { impressions: 0, clicks: 0, position: 0, count: 0 }
      queryMap.set(r.query, {
        impressions: prev.impressions + r.impressions,
        clicks: prev.clicks + r.clicks,
        position: prev.position + r.position,
        count: prev.count + 1,
      })
    }

    const gaps: ContentGap[] = []

    for (const [query, v] of Array.from(queryMap.entries())) {
      const position = v.position / v.count
      const ctr = v.impressions > 0 ? v.clicks / v.impressions : 0

      if (v.impressions >= 200 && ctr < 0.01 && position <= 30) {
        gaps.push({
          query,
          impressions: v.impressions,
          clicks: v.clicks,
          position: Math.round(position * 10) / 10,
          ctr: Math.round(ctr * 1000) / 10,
          gapType: 'high-impression-no-clicks',
          recommendation:
            'High visibility but no engagement — title/meta likely mismatched to intent. Rewrite the title tag to directly address what searchers want.',
        })
      } else if (position >= 11 && position <= 20 && v.impressions >= 150) {
        gaps.push({
          query,
          impressions: v.impressions,
          clicks: v.clicks,
          position: Math.round(position * 10) / 10,
          ctr: Math.round(ctr * 1000) / 10,
          gapType: 'near-page-one',
          recommendation:
            'Just off page one — strengthen on-page signals (header tags, internal links, content depth) to push into top 10.',
        })
      } else if (position <= 10 && v.impressions >= 100) {
        const expectedCtr = position <= 3 ? 0.08 : position <= 5 ? 0.04 : 0.02
        if (ctr < expectedCtr) {
          gaps.push({
            query,
            impressions: v.impressions,
            clicks: v.clicks,
            position: Math.round(position * 10) / 10,
            ctr: Math.round(ctr * 1000) / 10,
            gapType: 'ranking-but-weak',
            recommendation: `Ranking #${Math.round(position)} but CTR is below average for this position. Add a power word to the title tag and make the meta description more specific and action-oriented.`,
          })
        }
      }
    }

    return {
      gaps: gaps
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 50),
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to fetch content gaps' }
  }
}
