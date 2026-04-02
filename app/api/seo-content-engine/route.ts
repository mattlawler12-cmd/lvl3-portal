/**
 * SEO Content Engine — NDJSON Streaming API Route
 * Runs the full keyword + content pipeline with real-time progress events.
 * Topics execute in parallel with a configurable concurrency limit.
 */
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SeoAnthropicClient } from '@/lib/seo-content-engine/anthropic-client'
import { DataSources } from '@/lib/seo-content-engine/data-sources'
import { KeywordEngine } from '@/lib/seo-content-engine/keyword-engine'
import { ContentEngine } from '@/lib/seo-content-engine/content-engine'
import { generateDocx } from '@/lib/seo-content-engine/docx-writer'
import { slugify } from '@/lib/seo-content-engine/utils'
import { PARALLEL_TOPIC_LIMIT, MODES } from '@/lib/seo-content-engine/config'
import type {
  TopicInput,
  RunMode,
  PipelineEvent,
  DataAvailability,
} from '@/lib/seo-content-engine/types'

export const maxDuration = 800

export async function POST(request: Request) {
  // ── Auth (before ReadableStream — cookies need sync context) ──
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Check role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'member'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const service = await createServiceClient()

  // ── Parse request ────────────────────────────────────────────
  const formData = await request.formData()
  const clientId = formData.get('clientId') as string
  const mode = (formData.get('mode') as RunMode) ?? 'full'
  const brandContext = (formData.get('brandContext') as string) ?? ''
  const topicsJson = formData.get('topics') as string

  if (!clientId || !topicsJson) {
    return new Response(JSON.stringify({ error: 'Missing clientId or topics' }), { status: 400 })
  }

  let topics: TopicInput[]
  try {
    topics = JSON.parse(topicsJson) as TopicInput[]
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid topics JSON' }), { status: 400 })
  }

  if (!topics.length) {
    return new Response(JSON.stringify({ error: 'No topics provided' }), { status: 400 })
  }

  // Fetch client GSC site URL + brand context
  const { data: client } = await service
    .from('clients')
    .select('gsc_site_url, brand_context')
    .eq('id', clientId)
    .single()

  const gscSiteUrl = client?.gsc_site_url ?? null
  const clientBrandContext = (client?.brand_context as string | null) ?? null

  // Apply brand context: user input overrides client settings
  const finalBrandContext = brandContext || clientBrandContext || ''
  if (finalBrandContext) {
    for (const t of topics) {
      if (!t.brand_context) t.brand_context = finalBrandContext
    }
  }

  // Get API keys from environment
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? ''
  const keApiKey = process.env.KEYWORDS_EVERYWHERE_API_KEY ?? ''
  const semrushApiKey = process.env.SEMRUSH_API_KEY ?? ''

  // ── Stream ───────────────────────────────────────────────────
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: PipelineEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        } catch {
          // Stream may be closed
        }
      }

      try {
        // Create run record
        const { data: run, error: runErr } = await service
          .from('seo_content_engine_runs')
          .insert({
            client_id: clientId,
            mode,
            status: 'running',
            brand_context: finalBrandContext || null,
            topic_count: topics.length,
          })
          .select('id')
          .single()

        if (runErr || !run) {
          emit({ type: 'error', message: `Failed to create run: ${runErr?.message}` })
          controller.close()
          return
        }

        const runId = run.id
        emit({ type: 'run_started', runId, topicCount: topics.length })

        // ── Preflight: verify all connections before processing ──
        const preflightResults = await Promise.allSettled([
          // Anthropic — tiny completion
          (async () => {
            const client = new SeoAnthropicClient(anthropicApiKey)
            await client.call('keyword_gen', 'Reply with OK.', 'ping')
            return 'Connected'
          })(),
          // Keywords Everywhere — volume lookup for 1 test keyword
          (async () => {
            if (!keApiKey) throw new Error('API key not configured')
            const { fetchKEKeywordData } = await import('@/lib/connectors/keywords-everywhere')
            const rows = await fetchKEKeywordData(['seo'], keApiKey)
            return `Connected (${rows.length} result${rows.length !== 1 ? 's' : ''})`
          })(),
          // Semrush
          (async () => {
            if (!semrushApiKey) throw new Error('API key not configured')
            const { fetchSemrushDomainOrganic } = await import('@/lib/connectors/semrush-portal')
            const rows = await fetchSemrushDomainOrganic('example.com', semrushApiKey)
            return `Connected (${rows.length} keywords)`
          })(),
          // GSC
          (async () => {
            if (!gscSiteUrl) throw new Error('No GSC site URL configured for this client')
            const { fetchGSCRows } = await import('@/lib/tools-gsc')
            const rows = await fetchGSCRows(gscSiteUrl, 7)
            return `Connected (${rows.length} queries)`
          })(),
        ])

        const preflightNames = ['Anthropic', 'Keywords Everywhere', 'Semrush', 'GSC']
        let anthropicOk = false

        for (let i = 0; i < preflightResults.length; i++) {
          const r = preflightResults[i]
          const ok = r.status === 'fulfilled'
          const detail = ok
            ? (r as PromiseFulfilledResult<string>).value
            : (r as PromiseRejectedResult).reason?.message ?? 'Unknown error'
          emit({ type: 'preflight', source: preflightNames[i], ok, detail })
          if (i === 0) anthropicOk = ok
        }

        // Anthropic is required — abort if it fails
        if (!anthropicOk) {
          const reason = preflightResults[0].status === 'rejected'
            ? (preflightResults[0] as PromiseRejectedResult).reason?.message ?? 'Unknown error'
            : 'Unknown error'
          emit({ type: 'error', message: `Anthropic connection failed: ${reason}. Aborting run.` })
          await service
            .from('seo_content_engine_runs')
            .update({ status: 'failed', error: `Preflight failed: Anthropic — ${reason}`, updated_at: new Date().toISOString() })
            .eq('id', runId)
          controller.close()
          return
        }

        // Insert topic rows
        const topicRows = topics.map((t) => ({
          run_id: runId,
          title: t.title,
          target_audience: t.target_audience ?? null,
          angle: t.angle ?? null,
          existing_url: t.existing_url ?? null,
          pillar: t.pillar ?? null,
          funnel_stage: t.funnel_stage ?? null,
          primary_intent: t.primary_intent ?? null,
          summary: t.summary ?? null,
          differentiation_angle: t.differentiation_angle ?? null,
          internal_linking: t.internal_linking ?? null,
          geo_notes: t.geo_notes ?? null,
          seed_keywords: t.seed_keywords ?? [],
          status: 'pending',
        }))

        const { data: insertedTopics } = await service
          .from('seo_content_engine_topics')
          .insert(topicRows)
          .select('id')

        const topicIds = insertedTopics?.map((t) => t.id) ?? []

        // ── Parallel execution with semaphore ──────────────────
        const semaphore = {
          count: 0,
          max: PARALLEL_TOPIC_LIMIT,
          waiters: [] as (() => void)[],
          async acquire() {
            while (this.count >= this.max) {
              await new Promise<void>((resolve) => this.waiters.push(resolve))
            }
            this.count++
          },
          release() {
            this.count--
            const next = this.waiters.shift()
            if (next) next()
          },
        }

        let completedCount = 0

        const processTopic = async (topic: TopicInput, index: number) => {
          await semaphore.acquire()
          try {
            emit({ type: 'topic_started', topicIndex: index, title: topic.title })

            // Update DB status
            if (topicIds[index]) {
              await service
                .from('seo_content_engine_topics')
                .update({ status: 'running' })
                .eq('id', topicIds[index])
            }

            const dataAvailability: DataAvailability = {}

            // Create per-topic instances
            const llm = new SeoAnthropicClient(anthropicApiKey)
            const dataSources = new DataSources({
              keApiKey,
              semrushApiKey,
              gscSiteUrl,
              onDataSource: (source, status) => {
                dataAvailability[source] = status
                emit({ type: 'data_source', topicIndex: index, source, status })
              },
            })

            const onProgress = (phase: 'keywords' | 'content', step: string, detail: string, pct: number) => {
              emit({ type: 'progress', topicIndex: index, phase, step, detail, pct })
            }

            const onHeartbeat = (stage: string) => {
              emit({ type: 'heartbeat', topicIndex: index, stage })
            }

            const keywordEngine = new KeywordEngine(llm, dataSources, onProgress, onHeartbeat)
            const contentEngine = new ContentEngine(llm, dataSources, onProgress, onHeartbeat)

            // Run keyword pipeline
            const keywordPlan = await keywordEngine.run(topic)

            // Run content pipeline
            const contentResult = await contentEngine.run(topic, keywordPlan, mode)

            // Track Anthropic usage
            dataAvailability.anthropic = {
              status: 'success',
              stages_completed: llm.stagesCompleted,
              total_tokens: llm.totalTokens.input + llm.totalTokens.output,
            }

            // Generate DOCX and upload
            let docxPath: string | null = null
            const finalDraft = contentResult.revisedDraft ?? contentResult.draft
            try {
              const docxBuffer = await generateDocx({
                topic,
                keywordPlan,
                brief: contentResult.brief,
                draft: finalDraft,
                draftReview: contentResult.draftReview,
                wordCount: contentResult.wordCount,
                mode: MODES[mode] ?? mode,
              })

              const slug = slugify(topic.title)
              const storagePath = `${clientId}/seo-content/${runId}/${slug}.docx`

              await service.storage
                .from('client-assets')
                .upload(storagePath, docxBuffer, {
                  contentType:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  upsert: true,
                })

              docxPath = storagePath
            } catch (err) {
              console.error('DOCX generation/upload failed:', err)
            }

            // Update topic record
            const topicStatus = contentResult.error ? 'partial' : 'complete'
            if (topicIds[index]) {
              await service
                .from('seo_content_engine_topics')
                .update({
                  status: topicStatus,
                  keyword_plan: keywordPlan,
                  brief: contentResult.brief,
                  draft: finalDraft,
                  draft_review: contentResult.draftReview,
                  revised_draft: contentResult.revisedDraft,
                  warnings: contentResult.warnings,
                  word_count: contentResult.wordCount,
                  error: contentResult.error,
                  data_availability: dataAvailability,
                  docx_storage_path: docxPath,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', topicIds[index])
            }

            completedCount++
            emit({
              type: 'topic_complete',
              topicIndex: index,
              status: topicStatus as 'complete' | 'partial',
              wordCount: contentResult.wordCount,
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error(`Topic ${index} failed:`, msg)

            if (topicIds[index]) {
              await service
                .from('seo_content_engine_topics')
                .update({ status: 'failed', error: msg, updated_at: new Date().toISOString() })
                .eq('id', topicIds[index])
            }

            emit({ type: 'topic_error', topicIndex: index, error: msg })
          } finally {
            semaphore.release()
          }
        }

        // Launch all topics — semaphore limits concurrency
        await Promise.allSettled(topics.map((topic, i) => processTopic(topic, i)))

        // Update run record
        const runStatus = completedCount === topics.length ? 'complete' : completedCount > 0 ? 'partial' : 'failed'
        await service
          .from('seo_content_engine_runs')
          .update({
            status: runStatus,
            completed_count: completedCount,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', runId)

        emit({
          type: 'run_complete',
          runId,
          completedCount,
          totalCount: topics.length,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        emit({ type: 'error', message: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
