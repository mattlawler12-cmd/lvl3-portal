import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId } from '@/lib/client-resolution'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchGBPAccounts } from '@/app/actions/tools-extended'
import GBPAuditClient from './GBPAuditClient'
import type { ToolRun } from '@/components/tools/RunHistory'

export default async function GBPAuditPage() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  // Client name for display
  let clientName: string | null = null
  if (selectedClientId) {
    const service = await createServiceClient()
    const { data } = await service
      .from('clients')
      .select('name')
      .eq('id', selectedClientId)
      .single()
    clientName = data?.name ?? null
  }

  // GBP accounts the admin token has access to
  const accountsResult = await fetchGBPAccounts()
  const accounts = accountsResult.data ?? []
  const accountsError = accountsResult.error ?? null

  // Recent runs
  const service = await createServiceClient()
  const { data: runs } = await service
    .from('tool_runs')
    .select('id, status, created_at, completed_at, input, output, error')
    .eq('tool_slug', 'gbp-audit')
    .order('created_at', { ascending: false })
    .limit(20)

  const recentRuns: ToolRun[] = (runs ?? []).map((r) => ({
    id: r.id,
    tool_slug: 'gbp-audit',
    client_id: selectedClientId,
    status: r.status,
    created_at: r.created_at,
    completed_at: r.completed_at ?? null,
    input: r.input ?? {},
    output: r.output ?? null,
    error: r.error ?? null,
  }))

  return (
    <GBPAuditClient
      selectedClientId={selectedClientId}
      clientName={clientName}
      accounts={accounts}
      accountsError={accountsError}
      recentRuns={recentRuns}
    />
  )
}
