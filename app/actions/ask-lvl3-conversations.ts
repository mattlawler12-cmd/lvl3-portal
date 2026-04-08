'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ChatMessage, ChatArtifact } from '@/app/actions/ask-lvl3'

export type ConversationSummary = {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

// Returns up to 20 threads for the client, newest first
export async function listConversations(clientId: string): Promise<ConversationSummary[]> {
  await requireAdmin()
  const service = await createServiceClient()
  const { data } = await service
    .from('ask_lvl3_conversations')
    .select('id, title, created_at, updated_at')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })
    .limit(20)

  return (data ?? []) as ConversationSummary[]
}

// Returns messages for a given thread in chronological order
export async function loadConversation(conversationId: string): Promise<ChatMessage[]> {
  await requireAdmin()
  const service = await createServiceClient()
  const { data } = await service
    .from('ask_lvl3_messages')
    .select('role, content, artifacts')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  const rows = data ?? []

  // Re-sign any artifact URLs (they expire after 24h)
  const messages: ChatMessage[] = []
  for (const row of rows) {
    const rawArtifacts = (row.artifacts ?? []) as ChatArtifact[]
    let artifacts: ChatArtifact[] | undefined
    if (rawArtifacts.length > 0) {
      artifacts = await Promise.all(
        rawArtifacts.map(async (a) => {
          if (!a.path) return a
          const { data: signed } = await service.storage
            .from('chat-artifacts')
            .createSignedUrl(a.path, 86400)
          return { ...a, url: signed?.signedUrl ?? '' }
        })
      )
    }
    messages.push({
      role: row.role as 'user' | 'assistant',
      content: row.content as string,
      ...(artifacts?.length ? { artifacts } : {}),
    })
  }

  return messages
}

// Hard deletes a thread (cascades to messages)
export async function deleteConversation(conversationId: string): Promise<void> {
  await requireAdmin()
  const service = await createServiceClient()
  await service.from('ask_lvl3_conversations').delete().eq('id', conversationId)
}
