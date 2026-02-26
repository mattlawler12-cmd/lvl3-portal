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

// ── Semrush Competitor Gap Analysis ──────────────────────────────────────────

export type GapKeyword = {
  keyword: string
  volume: number
  difficulty: number
  competitorPositions: { domain: string; position: number }[]
  clientPosition: number | null
}

function normalizeDomain(raw: string): string {
  return raw
    .replace(/^sc-domain:/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim()
}

const PAGE_SECTION_FILTERS: Record<string, string | null> = {
  all: null,
  blog: 'Pu|Co|/blog/|Or|Pu|Co|/articles/|Or|Pu|Co|/news/',
  product: 'Pu|Co|/product/|Or|Pu|Co|/products/|Or|Pu|Co|/shop/',
  service: 'Pu|Co|/service/|Or|Pu|Co|/services/',
  location: 'Pu|Co|/location/|Or|Pu|Co|/locations/',
}

async function semrushQuery(
  domain: string,
  database: string,
  apiKey: string,
  displayFilter?: string | null
): Promise<{ Ph: string; Po: number; Nq: number; Kd: number }[]> {
  const params = new URLSearchParams({
    type: 'domain_organic',
    key: apiKey,
    domain,
    database,
    display_limit: '10000',
    export_columns: 'Ph,Po,Nq,Kd',
    export_decode: '1',
  })
  if (displayFilter) {
    params.set('display_filter', displayFilter)
  }

  const res = await fetch(`https://api.semrush.com/?${params.toString()}`)
  if (!res.ok) {
    const body = await res.text()
    console.error(`Semrush API error for ${domain}:`, res.status, body)
    return []
  }

  const text = await res.text()
  if (!text.trim()) return []

  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(';')
  return lines.slice(1).map((line) => {
    const cols = line.split(';')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim()] = cols[i]?.trim() ?? '' })
    return {
      Ph: row['Keyword'] ?? row['Ph'] ?? '',
      Po: parseInt(row['Position'] ?? row['Po'] ?? '0', 10),
      Nq: parseInt(row['Search Volume'] ?? row['Nq'] ?? '0', 10),
      Kd: parseFloat(row['Keyword Difficulty'] ?? row['Kd'] ?? '0'),
    }
  }).filter((r) => r.Ph)
}

export async function fetchSemrushGap(params: {
  clientDomain: string
  competitors: string[]
  pageSection: string
  database: string
}): Promise<{ gaps: GapKeyword[]; error?: string }> {
  try {
    await requireAdmin()

    const apiKey = process.env.SEMRUSH_API_KEY
    if (!apiKey) {
      return { gaps: [], error: 'SEMRUSH_API_KEY is not configured. Add it to your environment variables.' }
    }

    const competitors = params.competitors
      .map((c) => normalizeDomain(c))
      .filter(Boolean)

    if (competitors.length === 0 || competitors.length > 4) {
      return { gaps: [], error: 'Provide between 1 and 4 competitor domains.' }
    }

    const clientDomain = normalizeDomain(params.clientDomain)
    if (!clientDomain) {
      return { gaps: [], error: 'Client domain is required.' }
    }

    const db = params.database || 'us'
    const displayFilter = PAGE_SECTION_FILTERS[params.pageSection] ?? null

    // Fetch client keywords (no URL filter)
    const clientRows = await semrushQuery(clientDomain, db, apiKey)
    const clientMap = new Map<string, number>()
    for (const row of clientRows) {
      clientMap.set(row.Ph.toLowerCase(), row.Po)
    }

    // Fetch competitor keywords in parallel
    const competitorResults = await Promise.all(
      competitors.map(async (domain) => ({
        domain,
        rows: await semrushQuery(domain, db, apiKey, displayFilter),
      }))
    )

    // Merge: find keywords competitors rank for but client doesn't (or ranks >20)
    const gapMap = new Map<string, GapKeyword>()

    for (const { domain, rows } of competitorResults) {
      for (const row of rows) {
        const kw = row.Ph.toLowerCase()
        const clientPos = clientMap.get(kw) ?? null
        if (clientPos !== null && clientPos <= 20) continue

        const existing = gapMap.get(kw)
        if (existing) {
          existing.competitorPositions.push({ domain, position: row.Po })
          if (row.Nq > existing.volume) existing.volume = row.Nq
          if (row.Kd > existing.difficulty) existing.difficulty = row.Kd
        } else {
          gapMap.set(kw, {
            keyword: row.Ph,
            volume: row.Nq,
            difficulty: row.Kd,
            competitorPositions: [{ domain, position: row.Po }],
            clientPosition: clientPos,
          })
        }
      }
    }

    const gaps = Array.from(gapMap.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 100)

    return { gaps }
  } catch (err) {
    return { gaps: [], error: err instanceof Error ? err.message : 'Failed to run gap analysis' }
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
