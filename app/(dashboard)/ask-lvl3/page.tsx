import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId, getClientById } from '@/lib/client-resolution'
import AskLvl3Chat from './AskLvl3Chat'

export default async function AskLvl3Page() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  const client = selectedClientId
    ? await getClientById<{ id: string; name: string }>(selectedClientId, 'id, name')
    : null

  return <AskLvl3Chat clientId={selectedClientId} clientName={client?.name ?? null} />
}
