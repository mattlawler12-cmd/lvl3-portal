import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId, getClientById } from '@/lib/client-resolution'
import { GitCompare } from 'lucide-react'
import SemrushGapClient from './SemrushGapClient'

function extractDomain(gscUrl: string): string {
  return gscUrl
    .replace(/^sc-domain:/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim()
}

export default async function SemrushGapPage() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  if (!selectedClientId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <p className="text-sm text-surface-400">Select a client from the top bar to run this tool.</p>
      </div>
    )
  }

  const client = await getClientById<{ id: string; name: string; gsc_site_url: string | null }>(
    selectedClientId,
    'id, name, gsc_site_url'
  )

  const defaultClientDomain = client?.gsc_site_url ? extractDomain(client.gsc_site_url) : ''

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <GitCompare className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Competitor Gap Analysis</h1>
          <p className="mt-0.5 text-sm text-surface-400">
            {client?.name} — find keywords competitors rank for that you don&apos;t
          </p>
        </div>
      </div>

      <SemrushGapClient
        clientName={client?.name ?? ''}
        defaultClientDomain={defaultClientDomain}
      />
    </div>
  )
}
