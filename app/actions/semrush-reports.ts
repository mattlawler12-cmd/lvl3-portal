'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { SemrushReportMeta, SemrushReportFull } from './tools'

export async function listSemrushReports(clientId: string): Promise<SemrushReportMeta[]> {
  try {
    await requireAdmin()
    const service = await createServiceClient()
    const { data } = await service
      .from('semrush_reports')
      .select('id, client_domain, competitors, database, page_section, filters, client_keyword_count, keyword_count, created_at')
      .eq('client_id', clientId)
      .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20)
    return (data ?? []) as SemrushReportMeta[]
  } catch {
    return []
  }
}

export async function loadSemrushReport(reportId: string): Promise<SemrushReportFull | null> {
  try {
    await requireAdmin()
    const service = await createServiceClient()
    const { data } = await service
      .from('semrush_reports')
      .select('*')
      .eq('id', reportId)
      .single()
    return data as SemrushReportFull | null
  } catch {
    return null
  }
}

export async function deleteSemrushReport(reportId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    const service = await createServiceClient()
    await service.from('semrush_reports').delete().eq('id', reportId)
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete report' }
  }
}
