import { requireAuth } from '@/lib/auth'
import { getSelectedClientId, getClientById } from '@/lib/client-resolution'
import { createClient } from '@/lib/supabase/server'
import NavCards from '@/components/home/nav-cards'
import ClientSummary from '@/components/home/client-summary'

type HomeClient = {
  id: string
  name: string
  logo_url: string | null
  ai_summary: string | null
  ai_summary_updated_at: string | null
}

export default async function HomePage() {
  const { user } = await requireAuth()

  const selectedClientId =
    user.role === 'client'
      ? user.client_id
      : await getSelectedClientId()

  const selectedClient = selectedClientId
    ? await getClientById<HomeClient>(
        selectedClientId,
        'id, name, logo_url, ai_summary, ai_summary_updated_at',
      )
    : null

  let deliverableCount = 0
  if (selectedClient) {
    const supabase = await createClient()
    const { count } = await supabase
      .from('deliverables')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', selectedClient.id)
    deliverableCount = count ?? 0
  }

  const showSelector = user.role !== 'client'
  const isAdmin = user.role === 'admin'

  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Home</h1>
        <p className="mt-1 text-sm text-zinc-400">{user.email}</p>
      </div>

      {/* Quick-nav launchpad */}
      <section>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Quick Nav
        </p>
        <NavCards />
      </section>

      {/* Client section */}
      {selectedClient ? (
        <section>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Client Overview
          </p>
          <ClientSummary
            clientId={selectedClient.id}
            clientName={selectedClient.name}
            summary={selectedClient.ai_summary}
            summaryUpdatedAt={selectedClient.ai_summary_updated_at}
            deliverableCount={deliverableCount}
            isAdmin={isAdmin}
          />
        </section>
      ) : showSelector ? (
        <section>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center">
            <p className="text-sm text-zinc-400">
              Select a client from the sidebar to view their overview.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  )
}
