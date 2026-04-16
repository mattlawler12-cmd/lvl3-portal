import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId, getClientById } from '@/lib/client-resolution'
import { createServiceClient } from '@/lib/supabase/server'
import ContentRefreshFinderClient from './ContentRefreshFinderClient'
import type { ToolRun } from '@/components/tools/RunHistory'

interface ClientRow {
  id: string
  name: string
  gsc_site_url: string | null
  brand_context: string | null
}

export default async function ContentRefreshFinderPage() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  let client: ClientRow | null = null
  let recentRuns: ToolRun[] = []

  if (selectedClientId) {
    client = await getClientById<ClientRow>(
      selectedClientId,
      'id, name, gsc_site_url, brand_context'
    )

    const service = await createServiceClient()
    const { data } = await service
      .from('tool_runs')
      .select('id, tool_slug, client_id, status, created_at, completed_at, input, output, error')
      .eq('tool_slug', 'content-refresh-finder')
      .eq('client_id', selectedClientId)
      .order('created_at', { ascending: false })
      .limit(10)
    recentRuns = (data ?? []) as ToolRun[]
  }

  return (
    <ContentRefreshFinderClient
      selectedClientId={selectedClientId}
      clientName={client?.name ?? null}
      gscSiteUrl={client?.gsc_site_url ?? null}
      brandContext={client?.brand_context ?? null}
      recentRuns={recentRuns}
    />
  )
}
