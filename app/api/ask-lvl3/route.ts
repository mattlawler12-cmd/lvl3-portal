import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { gscQuery, ga4Query } from '@/lib/ask-tools'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

// ── Tool definitions ──────────────────────────────────────────────────────────

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
        startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date YYYY-MM-DD' },
        rowLimit: { type: 'number', description: 'Max rows to return (default 100)' },
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
        startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date YYYY-MM-DD' },
        rowLimit: { type: 'number', description: 'Max rows to return (default 100)' },
      },
      required: ['metrics', 'startDate', 'endDate'],
    },
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function today(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10)
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  client: { gsc_site_url: string | null; ga4_property_id: string | null }
): Promise<string> {
  try {
    if (name === 'get_gsc_data') {
      if (!client.gsc_site_url) {
        return 'Error: No Search Console site configured for this client.'
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
        return 'Error: No GA4 property configured for this client.'
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

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check before streaming
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const service = await createServiceClient()
  const { data: profile } = await service
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const body = await req.json()
  const {
    clientId,
    messages,
    conversationId: incomingConvId,
  }: { clientId: string; messages: ChatMessage[]; conversationId?: string } = body

  const encoder = new TextEncoder()

  function emit(controller: ReadableStreamDefaultController, obj: object) {
    controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Fetch client data
        const { data: client } = await service
          .from('clients')
          .select('name, gsc_site_url, ga4_property_id, analytics_summary, snapshot_insights')
          .eq('id', clientId)
          .single()

        if (!client) {
          emit(controller, { type: 'error', message: 'Client not found' })
          controller.close()
          return
        }

        // Build system prompt
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

        // Upsert conversation
        let conversationId: string = incomingConvId ?? ''
        if (!conversationId) {
          const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
          const title = lastUserMsg ? lastUserMsg.content.slice(0, 80) : 'New conversation'
          const { data: conv } = await service
            .from('ask_lvl3_conversations')
            .insert({ client_id: clientId, title })
            .select('id')
            .single()
          conversationId = conv?.id ?? ''
        } else {
          await service
            .from('ask_lvl3_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId)
        }

        // Insert the new user message (last in array)
        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
        if (lastUserMsg && conversationId) {
          await service.from('ask_lvl3_messages').insert({
            conversation_id: conversationId,
            role: 'user',
            content: lastUserMsg.content,
          })
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

        const loopMessages: Anthropic.MessageParam[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const MAX_ITERATIONS = 6
        let assistantText = ''

        for (let i = 0; i < MAX_ITERATIONS; i++) {
          const streamObj = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: systemPrompt,
            tools: TOOLS,
            messages: loopMessages,
          })

          let isToolIteration = false
          let partialText = '' // text emitted this iteration; cleared if tool_use detected

          for await (const event of streamObj) {
            if (
              event.type === 'content_block_start' &&
              event.content_block.type === 'tool_use'
            ) {
              if (!isToolIteration) {
                isToolIteration = true
                // Clear any thinking text we streamed before detecting tool_use
                if (partialText) {
                  emit(controller, { type: 'clear_partial' })
                  assistantText = assistantText.slice(0, assistantText.length - partialText.length)
                  partialText = ''
                }
              }
            }
            if (
              !isToolIteration &&
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              partialText += event.delta.text
              assistantText += event.delta.text
              emit(controller, { type: 'text', delta: event.delta.text })
            }
          }

          const finalMsg = await streamObj.finalMessage()

          if (finalMsg.stop_reason === 'end_turn') {
            if (conversationId && assistantText) {
              await service.from('ask_lvl3_messages').insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: assistantText,
              })
            }
            emit(controller, { type: 'done', conversationId })
            controller.close()
            return
          }

          if (finalMsg.stop_reason === 'tool_use') {
            loopMessages.push({ role: 'assistant', content: finalMsg.content })

            const toolBlocks = finalMsg.content.filter((b) => b.type === 'tool_use')

            // Emit status before executing tools
            for (const block of toolBlocks) {
              if (block.type !== 'tool_use') continue
              const statusText =
                block.name === 'get_gsc_data'
                  ? 'Querying Search Console…'
                  : 'Querying Google Analytics…'
              emit(controller, { type: 'status', text: statusText })
            }

            // Execute tools in parallel
            const toolResults = await Promise.all(
              toolBlocks.map(async (block) => {
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

            loopMessages.push({
              role: 'user',
              content: toolResults.filter(
                Boolean
              ) as Anthropic.Messages.ToolResultBlockParam[],
            })

            continue
          }

          // Unexpected stop reason — close out
          emit(controller, { type: 'done', conversationId })
          controller.close()
          return
        }

        // Hit max iterations — emit fallback answer
        const fallback =
          'I ran into repeated errors fetching the data and was unable to complete your request. ' +
          'This usually means the GSC or GA4 data source is unavailable or the date range returned no results. ' +
          'Try a simpler question, or check that the client\'s GSC site URL and GA4 property are configured correctly in client settings.'
        emit(controller, { type: 'text', delta: fallback })
        if (conversationId) {
          await service.from('ask_lvl3_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fallback,
          })
        }
        emit(controller, { type: 'done', conversationId })
        controller.close()
      } catch (err) {
        emit(controller, {
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to get response',
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  })
}
