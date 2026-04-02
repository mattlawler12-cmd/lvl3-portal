'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

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
