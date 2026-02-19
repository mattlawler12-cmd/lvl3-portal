import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/server'

export type UnviewedDeliverable = {
  id: string
  title: string
  viewed_at: string | null
}

export type OpenThreadEntry = {
  deliverableId: string
  title: string
  threadCount: number
}

type RawCommentRow = {
  deliverable_id: string
  deliverables: { id: string; title: string } | null
}

/**
 * Collapse raw comment rows (one per comment) into per-deliverable thread counts.
 * Shared by layout and home page — avoids duplicating the reduce logic.
 */
export function buildOpenThreads(rows: RawCommentRow[]): OpenThreadEntry[] {
  const map = new Map<string, { title: string; count: number }>()
  for (const row of rows) {
    const d = row.deliverables
    if (!d) continue
    const existing = map.get(d.id)
    if (existing) {
      existing.count++
    } else {
      map.set(d.id, { title: d.title, count: 1 })
    }
  }
  return Array.from(map.entries()).map(([deliverableId, { title, count }]) => ({
    deliverableId,
    title,
    threadCount: count,
  }))
}

/**
 * Fetch unviewed deliverables for a client.
 * Wrapped in React cache() so layout + home page share one DB round-trip per render.
 */
export const getUnviewedDeliverables = cache(
  async (clientId: string): Promise<UnviewedDeliverable[]> => {
    const service = await createServiceClient()
    const { data } = await service
      .from('deliverables')
      .select('id, title, viewed_at')
      .eq('client_id', clientId)
      .is('viewed_at', null)
      .order('created_at', { ascending: false })
    return (data ?? []) as UnviewedDeliverable[]
  }
)

/**
 * Fetch unresolved comment rows (with deliverable join) for a client.
 * Wrapped in React cache() so layout + home page share one DB round-trip per render.
 */
export const getOpenCommentRows = cache(
  async (clientId: string): Promise<RawCommentRow[]> => {
    const service = await createServiceClient()
    const { data } = await service
      .from('comments')
      .select('deliverable_id, deliverables!inner(id, title, client_id)')
      .eq('resolved', false)
      .eq('deliverables.client_id', clientId)
    return (data ?? []) as unknown as RawCommentRow[]
  }
)
