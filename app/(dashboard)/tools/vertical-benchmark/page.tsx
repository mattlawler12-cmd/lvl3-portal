import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId, getClientById } from '@/lib/client-resolution'
import { createServiceClient } from '@/lib/supabase/server'
import VerticalBenchmarkClient from './VerticalBenchmarkClient'
import type { ToolRun } from '@/components/tools/RunHistory'

interface ClientRow {
  id: string
  name: string
  gsc_site_url: string | null
}

export default async function VerticalBenchmarkPage() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  let clientName: string | null = null
  let clientDomain: string | null = null
  let recentRuns: ToolRun[] = []

  if (selectedClientId) {
    const client = await getClientById<ClientRow>(
      selectedClientId,
      'id, name, gsc_site_url'
    )
    clientName = client?.name ?? null

    const gscUrl = client?.gsc_site_url ?? null
    if (gscUrl) {
      clientDomain = gscUrl
        .replace('sc-domain:', '')
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
    }

    const service = await createServiceClient()
    const { data } = await service
      .from('tool_runs')
      .select('id, tool_slug, client_id, status, created_at, completed_at, input, output, error')
      .eq('tool_slug', 'vertical-benchmark')
      .eq('client_id', selectedClientId)
      .order('created_at', { ascending: false })
      .limit(10)
    recentRuns = (data ?? []) as ToolRun[]
  }

  return (
    <VerticalBenchmarkClient
      selectedClientId={selectedClientId}
      clientName={clientName}
      clientDomain={clientDomain}
      recentRuns={recentRuns}
    />
  )
}
