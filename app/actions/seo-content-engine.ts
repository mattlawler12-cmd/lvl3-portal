'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { generateDocx } from '@/lib/seo-content-engine/docx-writer'
import { slugify } from '@/lib/seo-content-engine/utils'
import { MODES } from '@/lib/seo-content-engine/config'
import type { TopicInput, KeywordPlan, ContentBrief, DraftReview } from '@/lib/seo-content-engine/types'

// ── Types ────────────────────────────────────────────────────────────────────

export type RunMeta = {
  id: string
  client_id: string
  mode: string
  status: string
  brand_context: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  error: string | null
  topic_count: number
  completed_count: number
}

export type TopicRow = {
  id: string
  run_id: string
  title: string
  target_audience: string | null
  angle: string | null
  existing_url: string | null
  pillar: string | null
  funnel_stage: string | null
  primary_intent: string | null
  summary: string | null
  differentiation_angle: string | null
  internal_linking: string | null
  geo_notes: string | null
  seed_keywords: string[]
  status: string
  keyword_plan: Record<string, unknown> | null
  brief: Record<string, unknown> | null
  draft: string | null
  draft_review: Record<string, unknown> | null
  revised_draft: string | null
  warnings: string[]
  word_count: number | null
  error: string | null
  data_availability: Record<string, unknown>
  docx_storage_path: string | null
  brief_json_storage_path: string | null
  created_at: string
  updated_at: string
}

export type RunWithTopics = RunMeta & {
  topics: TopicRow[]
}

// ── listRuns ─────────────────────────────────────────────────────────────────

export async function listRuns(
  clientId: string
): Promise<{ data?: RunMeta[]; error?: string }> {
  try {
    await requireAdmin()
    const service = await createServiceClient()

    const { data, error } = await service
      .from('seo_content_engine_runs')
      .select('*')
      .eq('client_id', clientId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return { data: (data ?? []) as RunMeta[] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to list runs' }
  }
}

// ── loadRun ──────────────────────────────────────────────────────────────────

export async function loadRun(
  runId: string
): Promise<{ data?: RunWithTopics; error?: string }> {
  try {
    await requireAdmin()
    const service = await createServiceClient()

    const { data: run, error: runError } = await service
      .from('seo_content_engine_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (runError) throw runError
    if (!run) throw new Error('Run not found')

    const { data: topics, error: topicsError } = await service
      .from('seo_content_engine_topics')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true })

    if (topicsError) throw topicsError

    return {
      data: {
        ...(run as RunMeta),
        topics: (topics ?? []) as TopicRow[],
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load run' }
  }
}

// ── getDocxUrl ───────────────────────────────────────────────────────────────

export async function getDocxUrl(
  storagePath: string
): Promise<{ data?: string; error?: string }> {
  try {
    await requireAdmin()
    const service = await createServiceClient()

    const { data, error } = await service.storage
      .from('client-assets')
      .createSignedUrl(storagePath, 3600)

    if (error) throw error
    if (!data?.signedUrl) throw new Error('Failed to generate signed URL')

    return { data: data.signedUrl }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to get download URL' }
  }
}

// ── deleteRun (soft delete) ──────────────────────────────────────────────────

export async function deleteRun(
  runId: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    const service = await createServiceClient()

    const { error } = await service
      .from('seo_content_engine_runs')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', runId)

    if (error) throw error
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete run' }
  }
}

// ── regenerateDocx ──────────────────────────────────────────────────────────
// Re-generates DOCX from existing DB data (no LLM calls) and uploads to storage.

export async function regenerateDocx(
  topicId: string
): Promise<{ data?: { storagePath: string }; error?: string }> {
  try {
    await requireAdmin()
    const service = await createServiceClient()

    // Fetch topic + its run
    const { data: topic, error: topicErr } = await service
      .from('seo_content_engine_topics')
      .select('*')
      .eq('id', topicId)
      .single()

    if (topicErr) throw topicErr
    if (!topic) throw new Error('Topic not found')

    const { data: run, error: runErr } = await service
      .from('seo_content_engine_runs')
      .select('id, client_id, mode')
      .eq('id', topic.run_id)
      .single()

    if (runErr) throw runErr
    if (!run) throw new Error('Run not found')

    // Build TopicInput from DB row
    const topicInput: TopicInput = {
      title: topic.title,
      target_audience: topic.target_audience ?? undefined,
      angle: topic.angle ?? undefined,
      existing_url: topic.existing_url ?? undefined,
      pillar: topic.pillar ?? undefined,
      funnel_stage: topic.funnel_stage ?? undefined,
      primary_intent: topic.primary_intent ?? undefined,
      summary: topic.summary ?? undefined,
      differentiation_angle: topic.differentiation_angle ?? undefined,
      internal_linking: topic.internal_linking ?? undefined,
      geo_notes: topic.geo_notes ?? undefined,
      seed_keywords: (topic.seed_keywords ?? []) as unknown as TopicInput['seed_keywords'],
    }

    const finalDraft = topic.revised_draft ?? topic.draft
    const modeLabel = MODES[run.mode] ?? run.mode

    const docxBuffer = await generateDocx({
      topic: topicInput,
      keywordPlan: (topic.keyword_plan as KeywordPlan | null) ?? null,
      brief: (topic.brief as ContentBrief | Record<string, unknown> | null) ?? null,
      draft: finalDraft,
      draftReview: (topic.draft_review as DraftReview | null) ?? null,
      wordCount: topic.word_count ?? 0,
      mode: modeLabel,
    })

    const slug = slugify(topic.title)
    const storagePath = `${run.client_id}/seo-content/${run.id}/${slug}.docx`

    const { error: uploadErr } = await service.storage
      .from('client-assets')
      .upload(storagePath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    if (uploadErr) throw uploadErr

    // Update topic row with new path
    await service
      .from('seo_content_engine_topics')
      .update({
        docx_storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', topicId)

    return { data: { storagePath } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to regenerate DOCX' }
  }
}
