'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { fetchGSCRows } from '@/lib/tools-gsc'
import { fetchGA4Report } from '@/lib/google-analytics'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AskResult = {
  reply?: string
  error?: string
}

export async function sendChatMessage(
  clientId: string,
  messages: ChatMessage[]
): Promise<AskResult> {
  try {
    await requireAdmin()

    const service = await createServiceClient()
    const { data: client } = await service
      .from('clients')
      .select('name, gsc_site_url, ga4_property_id, analytics_summary, snapshot_insights')
      .eq('id', clientId)
      .single()

    if (!client) throw new Error('Client not found')

    const contextParts: string[] = [`Client: ${client.name}`]

    if (client.analytics_summary) {
      contextParts.push(`Analytics Summary:\n${client.analytics_summary}`)
    }

    if (client.snapshot_insights) {
      const si = client.snapshot_insights as {
        takeaways?: string
        anomalies?: string
        opportunities?: string
      }
      if (si.takeaways) contextParts.push(`Key Takeaways: ${si.takeaways}`)
      if (si.anomalies) contextParts.push(`Anomalies: ${si.anomalies}`)
      if (si.opportunities) contextParts.push(`Opportunities: ${si.opportunities}`)
    }

    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() ?? ''
    const wantsGSCData =
      client.gsc_site_url &&
      (lastMessage.includes('keyword') ||
        lastMessage.includes('ranking') ||
        lastMessage.includes('query') ||
        lastMessage.includes('search') ||
        lastMessage.includes('position') ||
        lastMessage.includes('impression') ||
        lastMessage.includes('click') ||
        lastMessage.includes('page') ||
        lastMessage.includes('url') ||
        lastMessage.includes('trending') ||
        lastMessage.includes('organic') ||
        lastMessage.includes('traffic') ||
        lastMessage.includes('gsc') ||
        lastMessage.includes('search console'))

    if (wantsGSCData && client.gsc_site_url) {
      try {
        const rows = await fetchGSCRows(client.gsc_site_url, 90)

        // Top queries by clicks
        const topQueries = rows
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 20)
          .map(
            (r) =>
              `"${r.query}" — pos ${r.position.toFixed(1)}, ${r.clicks} clicks, ${r.impressions} impressions`
          )
          .join('\n')
        contextParts.push(`Live GSC Data — Top Queries (last 90 days):\n${topQueries}`)

        // Aggregate by page
        const pageMap = new Map<string, { clicks: number; impressions: number; position: number; count: number }>()
        for (const r of rows) {
          const prev = pageMap.get(r.page) ?? { clicks: 0, impressions: 0, position: 0, count: 0 }
          pageMap.set(r.page, {
            clicks: prev.clicks + r.clicks,
            impressions: prev.impressions + r.impressions,
            position: prev.position + r.position,
            count: prev.count + 1,
          })
        }
        const topPages = Array.from(pageMap.entries())
          .map(([page, v]) => ({
            page,
            clicks: v.clicks,
            impressions: v.impressions,
            position: Math.round((v.position / v.count) * 10) / 10,
          }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 20)
          .map(
            (p) =>
              `${p.page} — ${p.clicks} clicks, ${p.impressions} impressions, avg pos ${p.position}`
          )
          .join('\n')
        contextParts.push(`Live GSC Data — Top Pages by Clicks (last 90 days):\n${topPages}`)
      } catch {
        // silently skip if GSC fetch fails
      }
    }

    // Fetch live GA4 page data if the question is about pages/sessions/traffic
    const wantsGA4PageData =
      client.ga4_property_id &&
      (lastMessage.includes('page') ||
        lastMessage.includes('session') ||
        lastMessage.includes('traffic') ||
        lastMessage.includes('landing') ||
        lastMessage.includes('trending') ||
        lastMessage.includes('organic') ||
        lastMessage.includes('ga4') ||
        lastMessage.includes('analytics'))

    if (wantsGA4PageData && client.ga4_property_id) {
      try {
        const report = await fetchGA4Report(client.ga4_property_id)
        const topPages = report.organicLandingPages
          .slice(0, 20)
          .map(
            (p) =>
              `${p.page} — ${p.sessions.toLocaleString()} sessions (${p.sessionsDelta >= 0 ? '+' : ''}${p.sessionsDelta}% vs prior period)`
          )
          .join('\n')
        contextParts.push(
          `Live GA4 Landing Page Data (last 90 days vs prior 90 days, top pages by sessions):\n${topPages}`
        )
      } catch {
        // silently skip if GA4 fetch fails
      }
    }

    const systemPrompt = `You are Ask LVL3, an expert SEO and digital marketing strategist for the agency LVL3. You are advising the internal team on a specific client.

${contextParts.join('\n\n')}

Answer questions concisely and specifically. Use data from the context above when relevant. Be direct and actionable — skip preamble. When making recommendations, be specific about what to change and why.`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const reply =
      response.content[0].type === 'text' ? response.content[0].text : ''

    return { reply }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to get response' }
  }
}
