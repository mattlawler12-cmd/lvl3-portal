import { requireAuth } from '@/lib/auth'
import DeliverablesClient from '@/components/deliverables/deliverables-client'
import type { DeliverableWithClient } from '@/app/actions/deliverables'

export default async function DeliverablesPage() {
  const { supabase, user } = await requireAuth()

  const isAdmin = user.role === 'admin'

  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('*, clients(id, name, slug)')
    .order('created_at', { ascending: false })

  let clients: { id: string; name: string }[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .order('name')
    clients = data ?? []
  }

  return (
    <DeliverablesClient
      initialDeliverables={(deliverables ?? []) as DeliverableWithClient[]}
      clients={clients}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  )
}
