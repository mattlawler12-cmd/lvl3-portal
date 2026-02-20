'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { fetchGSCRows } from '@/lib/tools-gsc'

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
        lastMessage.includes('gsc') ||
        lastMessage.includes('search console'))

    if (wantsGSCData && client.gsc_site_url) {
      try {
        const rows = await fetchGSCRows(client.gsc_site_url, 30)
        const top20 = rows
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 20)
          .map(
            (r) =>
              `"${r.query}" — pos ${r.position.toFixed(1)}, ${r.clicks} clicks, ${r.impressions} impressions`
          )
          .join('\n')
        contextParts.push(`Live GSC Data (last 30 days, top queries by clicks):\n${top20}`)
      } catch {
        // silently skip if GSC fetch fails
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
