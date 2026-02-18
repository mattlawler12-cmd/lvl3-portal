import { requireAuth } from '@/lib/auth'
import { getSelectedClientId, getClientById } from '@/lib/client-resolution'
import LookerEmbed from '@/components/dashboard/looker-embed'
import { BarChart2 } from 'lucide-react'

export default async function DashboardPage() {
  const { user } = await requireAuth()

  type ClientRow = { id: string; name: string; looker_embed_url: string | null }

  const selectedClientId = user.role === 'client'
    ? user.client_id
    : await getSelectedClientId()

  const selectedClient = selectedClientId
    ? await getClientById<ClientRow>(selectedClientId, 'id, name, looker_embed_url')
    : null

  const showSelector = user.role === 'admin' || user.role === 'member'

  const lookerUrl = selectedClient?.looker_embed_url ?? null

  // ── Render ───────────────────────────────────────────────────────────────────

  const hasIframe = !!lookerUrl

  return (
    <div className={hasIframe ? 'flex flex-col h-screen' : 'p-8 space-y-6'}>
      {/* Header */}
      <div className={hasIframe ? 'p-8 pb-4 flex-shrink-0' : ''}>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-zinc-400 text-sm">
          {selectedClient ? selectedClient.name : 'Your analytics and reporting.'}
        </p>
      </div>

      {/* Content */}
      {!selectedClient && showSelector ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-zinc-400">Select a client from the sidebar to view their dashboard.</p>
        </div>
      ) : !selectedClient ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-zinc-400">No client assigned to your account.</p>
        </div>
      ) : !lookerUrl ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-8 max-w-md">
            <BarChart2 className="w-10 h-10 text-zinc-600 mb-3 mx-auto" />
            <h3 className="text-white font-semibold mb-2">Dashboard Coming Soon</h3>
            <p className="text-zinc-400 text-sm">
              Your dashboard is being set up — check back soon.
            </p>
          </div>
        </div>
      ) : (
        <div className={hasIframe ? 'flex-1 overflow-hidden px-8 pb-8' : ''}>
          <LookerEmbed url={lookerUrl} clientName={selectedClient.name} />
        </div>
      )}
    </div>
  )
}
