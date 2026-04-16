import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import CROAuditClient from './CROAuditClient'
import type { ToolRun } from '@/components/tools/RunHistory'

export default async function LandingPageCROAuditPage() {
  const { user } = await requireAdmin()

  const service = await createServiceClient()
  const { data } = await service
    .from('tool_runs')
    .select('id, tool_slug, client_id, status, created_at, completed_at, input, output, error')
    .eq('tool_slug', 'landing-page-cro-audit')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const recentRuns = (data ?? []) as ToolRun[]

  return <CROAuditClient recentRuns={recentRuns} />
}
