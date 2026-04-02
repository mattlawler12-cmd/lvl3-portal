import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId, getClientById } from '@/lib/client-resolution'
import { FileText } from 'lucide-react'
import SeoContentEngineClient from './SeoContentEngineClient'

export default async function SeoContentEnginePage() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  if (!selectedClientId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <p className="text-sm text-surface-400">Select a client from the top bar to run this tool.</p>
      </div>
    )
  }

  const client = await getClientById<{ id: string; name: string; brand_context: string | null }>(
    selectedClientId,
    'id, name, brand_context'
  )

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-surface-400" />
        <div>
          <h1 className="text-xl font-semibold text-surface-100">SEO Content Engine</h1>
          <p className="mt-0.5 text-sm text-surface-400">
            Full pipeline: keyword research → brief → draft → DOCX export
          </p>
        </div>
      </div>

      <SeoContentEngineClient
        clientId={selectedClientId}
        clientName={client?.name ?? 'Client'}
        clientBrandContext={client?.brand_context ?? null}
      />
    </div>
  )
}
