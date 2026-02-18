import { requireAdmin } from '@/lib/auth'
import { getClientsWithStats } from '@/app/actions/clients'
import ClientsGrid from '@/components/clients/clients-grid'

export default async function ClientsPage() {
  await requireAdmin()

  const clients = await getClientsWithStats()

  return (
    <div className="p-8">
      <ClientsGrid clients={clients} />
    </div>
  )
}
