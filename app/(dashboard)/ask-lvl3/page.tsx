import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId, getClientById } from '@/lib/client-resolution'
import { listConversations, loadConversation } from '@/app/actions/ask-lvl3-conversations'
import AskLvl3Chat from './AskLvl3Chat'

export default async function AskLvl3Page() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  const client = selectedClientId
    ? await getClientById<{ id: string; name: string }>(selectedClientId, 'id, name')
    : null

  const conversations = selectedClientId ? await listConversations(selectedClientId) : []

  const initialMessages =
    conversations.length > 0 ? await loadConversation(conversations[0].id) : []

  const initialConversationId = conversations[0]?.id ?? null

  return (
    <AskLvl3Chat
      clientId={selectedClientId}
      clientName={client?.name ?? null}
      conversations={conversations}
      initialMessages={initialMessages}
      initialConversationId={initialConversationId}
    />
  )
}
