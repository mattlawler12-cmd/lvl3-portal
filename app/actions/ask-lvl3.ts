'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { gscQuery, ga4Query } from '@/lib/ask-tools'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AskResult = {
  reply?: string
  error?: string
}

// ── Tool definitions sent to the model ───────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_gsc_data',
    description: `Query Google Search Console search analytics data for this client.
Use this whenever the question involves keywords, queries, pages, clicks, impressions, CTR, rankings, or organic search trends.
You can call this multiple times with different date ranges to compare periods.

Available dimensions (pass one or more):
  "query"  — keyword/search term level
  "page"   — landing page URL level
  "date"   — daily breakdown
  "device" — desktop / mobile / tablet

Date format: YYYY-MM-DD
rowLimit: max rows to return (default 100, max 25000)

Examples:
  - Top pages by clicks this month: dimensions=["page"], last 30 days
  - Monthly trend for a keyword: dimensions=["date","query"], filter by date range
  - Compare page clicks period over period: call twice with different date ranges`,
    input_schema: {
      type: 'object' as const,
      properties: {
        dimensions: {
          type: 'array',
          items: { type: 'string', enum: ['query', 'page', 'date', 'device'] },
          description: 'Dimensions to group by',
        },
        startDate: {
          type: 'string',
          description: 'Start date YYYY-MM-DD',
        },
        endDate: {
          type: 'string',
          description: 'End date YYYY-MM-DD',
        },
        rowLimit: {
          type: 'number',
          description: 'Max rows to return (default 100)',
        },
      },
      required: ['dimensions', 'startDate', 'endDate'],
    },
  },
  {
    name: 'get_ga4_data',
    description: `Query Google Analytics 4 data for this client.
Use this for questions about sessions, users, pageviews, revenue, conversions, traffic sources, or landing page performance.
You can call this multiple times with different date ranges or metric/dimension combinations.

Common metrics: sessions, totalUsers, screenPageViews, bounceRate, purchaseRevenue, transactions, averageSessionDuration
Common dimensions: sessionDefaultChannelGroup, landingPage, yearMonth, date, deviceCategory, country

Date format: YYYY-MM-DD
rowLimit: max rows to return (default 100)

Examples:
  - Top landing pages by sessions: dimensions=["landingPage"], metrics=["sessions"]
  - Monthly session trend: dimensions=["yearMonth"], metrics=["sessions","totalUsers"]
  - Channel breakdown: dimensions=["sessionDefaultChannelGroup"], metrics=["sessions"]`,
    input_schema: {
      type: 'object' as const,
      properties: {
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'GA4 metric names',
        },
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'GA4 dimension names (optional)',
        },
        startDate: {
          type: 'string',
          description: 'Start date YYYY-MM-DD',
        },
        endDate: {
          type: 'string',
          description: 'End date YYYY-MM-DD',
        },
        rowLimit: {
          type: 'number',
          description: 'Max rows to return (default 100)',
        },
      },
      required: ['metrics', 'startDate', 'endDate'],
    },
  },
]

// ── Date helpers ──────────────────────────────────────────────────────────────

function today(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10)
}

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  client: { gsc_site_url: string | null; ga4_property_id: string | null }
): Promise<string> {
  try {
    if (name === 'get_gsc_data') {
      if (!client.gsc_site_url) {
        return 'Error: No Search Console site configured for this client. Ask the admin to set it in client settings.'
      }
      const rows = await gscQuery({
        siteUrl: client.gsc_site_url,
        startDate: input.startDate as string,
        endDate: input.endDate as string,
        dimensions: input.dimensions as string[],
        rowLimit: (input.rowLimit as number) ?? 100,
      })
      if (rows.length === 0) return 'No data found for this date range and dimensions.'
      return JSON.stringify(rows)
    }

    if (name === 'get_ga4_data') {
      if (!client.ga4_property_id) {
        return 'Error: No GA4 property configured for this client. Ask the admin to set it in client settings.'
      }
      const rows = await ga4Query({
        propertyId: client.ga4_property_id,
        startDate: input.startDate as string,
        endDate: input.endDate as string,
        metrics: input.metrics as string[],
        dimensions: input.dimensions as string[] | undefined,
        rowLimit: (input.rowLimit as number) ?? 100,
      })
      if (rows.length === 0) return 'No data found for this date range and dimensions.'
      return JSON.stringify(rows)
    }

    return `Unknown tool: ${name}`
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ── Main action ───────────────────────────────────────────────────────────────

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

    // Build system prompt with client context
    const contextParts: string[] = [
      `Client: ${client.name}`,
      `Today's date: ${today()}`,
      `GSC site: ${client.gsc_site_url ?? 'not configured'}`,
      `GA4 property: ${client.ga4_property_id ?? 'not configured'}`,
    ]

    if (client.analytics_summary) {
      contextParts.push(`Stored Analytics Summary:\n${client.analytics_summary}`)
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

    const systemPrompt = `You are Ask LVL3, an expert SEO and digital marketing strategist for the agency LVL3, advising the internal team on a specific client.

${contextParts.join('\n\n')}

You have two tools available to fetch live data:
- get_gsc_data: Query Google Search Console (keywords, pages, clicks, impressions, rankings)
- get_ga4_data: Query Google Analytics 4 (sessions, users, traffic, revenue, landing pages)

When a question requires data, use the tools to fetch it rather than saying you don't have it.
For trend or comparison questions, call the tool twice — once for the current period and once for the prior period — then calculate the delta yourself.
Be specific and direct. Skip preamble. Lead with the actual answer, then support it with data.`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Convert chat history to Anthropic format
    const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // Agentic loop — model can call tools multiple times before giving final answer
    const loopMessages = [...apiMessages]
    const MAX_ITERATIONS = 6

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOLS,
        messages: loopMessages,
      })

      // If model is done (no tool calls), return the text response
      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((b) => b.type === 'text')
        return { reply: textBlock && textBlock.type === 'text' ? textBlock.text : '' }
      }

      // If model wants to use tools
      if (response.stop_reason === 'tool_use') {
        // Add assistant's response (with tool calls) to message history
        loopMessages.push({ role: 'assistant', content: response.content })

        // Execute all tool calls in parallel
        const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')

        const toolResults = await Promise.all(
          toolUseBlocks.map(async (block) => {
            if (block.type !== 'tool_use') return null
            const result = await executeTool(
              block.name,
              block.input as Record<string, unknown>,
              { gsc_site_url: client.gsc_site_url, ga4_property_id: client.ga4_property_id }
            )
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: result,
            }
          })
        )

        // Add tool results to message history
        loopMessages.push({
          role: 'user',
          content: toolResults.filter(Boolean) as Anthropic.Messages.ToolResultBlockParam[],
        })

        // Continue loop — model will process results and either answer or call more tools
        continue
      }

      // Unexpected stop reason — return whatever text we have
      const textBlock = response.content.find((b) => b.type === 'text')
      return { reply: textBlock && textBlock.type === 'text' ? textBlock.text : 'No response generated.' }
    }

    return { reply: 'Reached maximum tool call iterations. Try a more specific question.' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to get response' }
  }
}
