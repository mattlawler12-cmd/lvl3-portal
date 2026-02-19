'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { parseSheetId, fetchSheetHeaders } from '@/lib/google-sheets'
import { fetchGA4Metrics, GA4Metrics } from '@/lib/google-analytics'
import { fetchGSCMetrics, GSCMetrics } from '@/lib/google-search-console'
import Anthropic from '@anthropic-ai/sdk'

export type { GA4Metrics, GSCMetrics }

export async function fetchLogoUrl(domain: string): Promise<string | null> {
  const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!clean) return null
  const url = `https://logo.clearbit.com/${clean}`
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok ? url : null
  } catch {
    return null
  }
}

export async function getSheetHeadersAction(
  sheetIdOrUrl: string,
  headerRow: number
): Promise<{ headers?: string[]; error?: string }> {
  try {
    await requireAdmin()
    const id = parseSheetId(sheetIdOrUrl)
    const headers = await fetchSheetHeaders(id, headerRow)
    return { headers }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load headers' }
  }
}

export type AnalyticsData = {
  ga4: GA4Metrics | null
  gsc: GSCMetrics | null
  error?: string
}

export async function fetchAnalyticsData(clientId: string): Promise<AnalyticsData> {
  const service = await createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('ga4_property_id, gsc_site_url')
    .eq('id', clientId)
    .single()

  if (!client) return { ga4: null, gsc: null, error: 'Client not found' }

  const [ga4Result, gscResult] = await Promise.allSettled([
    client.ga4_property_id
      ? fetchGA4Metrics(client.ga4_property_id)
      : Promise.resolve(null),
    client.gsc_site_url
      ? fetchGSCMetrics(client.gsc_site_url)
      : Promise.resolve(null),
  ])

  const ga4 = ga4Result.status === 'fulfilled' ? ga4Result.value : null
  const gsc = gscResult.status === 'fulfilled' ? gscResult.value : null
  const firstError =
    ga4Result.status === 'rejected'
      ? String(ga4Result.reason)
      : gscResult.status === 'rejected'
      ? String(gscResult.reason)
      : undefined

  return { ga4, gsc, error: firstError }
}

export async function generateAnalyticsInsights(
  clientId: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin()

    const data = await fetchAnalyticsData(clientId)

    if (!data.ga4 && !data.gsc) {
      const msg = data.error
        ? `Analytics fetch failed: ${data.error}`
        : 'No analytics data available. Configure GA4 Property ID and/or GSC Site URL in client settings, and ensure the service account has been granted access.'
      return { error: msg }
    }

    const parts: string[] = []

    if (data.ga4) {
      const { sessions, users, pageviews, bounceRate, topChannels, sessionsDelta, usersDelta } =
        data.ga4
      parts.push(
        `GA4 (last 30 days): ${sessions.toLocaleString()} sessions (${sessionsDelta >= 0 ? '+' : ''}${sessionsDelta}% vs prior period), ${users.toLocaleString()} users (${usersDelta >= 0 ? '+' : ''}${usersDelta}%), ${pageviews.toLocaleString()} pageviews, bounce rate ${(bounceRate * 100).toFixed(1)}%. Top channels: ${topChannels
          .slice(0, 3)
          .map((c) => `${c.channel} (${c.sessions.toLocaleString()})`)
          .join(', ')}.`
      )
    }

    if (data.gsc) {
      const { clicks, impressions, ctr, position, topQueries } = data.gsc
      parts.push(
        `Search Console (last 28 days): ${clicks.toLocaleString()} clicks, ${impressions.toLocaleString()} impressions, ${ctr.toFixed(1)}% CTR, avg position ${position.toFixed(1)}. Top queries: ${topQueries
          .slice(0, 3)
          .map((q) => `"${q.query}" (${q.clicks} clicks)`)
          .join(', ')}.`
      )
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a digital marketing analyst writing a concise analytics summary for a client report. Write 2-3 short paragraphs summarizing the following data in plain, client-friendly language. Focus on notable trends, wins, and areas of opportunity. Do not use bullet points or markdown formatting.\n\n${parts.join('\n\n')}`,
        },
      ],
    })

    const summary =
      message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    if (!summary) return { error: 'Claude returned an empty response' }

    const service = await createServiceClient()
    const { error: dbError } = await service
      .from('clients')
      .update({
        analytics_summary: summary,
        analytics_summary_updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)

    if (dbError) return { error: dbError.message }

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' }
  }
}
