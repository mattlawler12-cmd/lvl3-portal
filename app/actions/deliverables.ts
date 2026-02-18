'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export type DeliverableWithClient = {
  id: string
  client_id: string
  title: string
  file_url: string | null
  file_type: 'pdf' | 'slides' | 'sheets' | 'link'
  viewed_at: string | null
  created_at: string
  clients: { id: string; name: string; slug: string } | null
}

export type CommentWithUser = {
  id: string
  deliverable_id: string
  user_id: string
  body: string
  parent_id: string | null
  resolved: boolean
  created_at: string
  users: { email: string }
}

export async function createDeliverable(formData: FormData) {
  // Server-side admin check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  const serviceSupabase = await createServiceClient()
  const clientId = formData.get('clientId') as string
  const title = formData.get('title') as string
  const fileType = formData.get('fileType') as string
  const file = formData.get('file') as File | null
  const url = formData.get('url') as string | null

  let fileUrl: string | null = url || null

  if (file && file.size > 0) {
    const deliverableId = crypto.randomUUID()
    const ext = file.name.split('.').pop() ?? 'pdf'
    const filePath = `${clientId}/${deliverableId}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: storageError } = await serviceSupabase.storage
      .from('deliverables')
      .upload(filePath, arrayBuffer, { contentType: file.type })

    if (storageError) throw new Error(storageError.message)
    fileUrl = filePath

    const { error } = await serviceSupabase.from('deliverables').insert({
      id: deliverableId,
      client_id: clientId,
      title,
      file_url: fileUrl,
      file_type: fileType,
    })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await serviceSupabase.from('deliverables').insert({
      client_id: clientId,
      title,
      file_url: fileUrl,
      file_type: fileType,
    })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/deliverables')
}

export async function getSignedUrl(filePath: string): Promise<string> {
  // Verify the current user can access this deliverable (RLS applies)
  const supabase = await createClient()
  const { data: accessible } = await supabase
    .from('deliverables')
    .select('id')
    .eq('file_url', filePath)
    .single()

  if (!accessible) throw new Error('Access denied')

  const serviceSupabase = await createServiceClient()
  const { data, error } = await serviceSupabase.storage
    .from('deliverables')
    .createSignedUrl(filePath, 3600)

  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function markViewed(deliverableId: string) {
  const supabase = await createClient()

  // Access check via RLS — will return null if user can't read this row
  const { data } = await supabase
    .from('deliverables')
    .select('id, viewed_at')
    .eq('id', deliverableId)
    .single()

  if (!data || data.viewed_at) return

  const serviceSupabase = await createServiceClient()
  await serviceSupabase
    .from('deliverables')
    .update({ viewed_at: new Date().toISOString() })
    .eq('id', deliverableId)
    .is('viewed_at', null)
}

export async function fetchComments(deliverableId: string): Promise<CommentWithUser[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('comments')
    .select('id, deliverable_id, user_id, body, parent_id, resolved, created_at, users!inner(email)')
    .eq('deliverable_id', deliverableId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as CommentWithUser[]
}

export async function postComment(
  deliverableId: string,
  body: string,
  parentId?: string
): Promise<CommentWithUser> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [{ data: userProfile }, { data: deliverable }] = await Promise.all([
    supabase.from('users').select('role, client_id').eq('id', user.id).single(),
    supabase.from('deliverables').select('title, client_id').eq('id', deliverableId).single(),
  ])

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      deliverable_id: deliverableId,
      user_id: user.id,
      body,
      parent_id: parentId ?? null,
    })
    .select('id, deliverable_id, user_id, body, parent_id, resolved, created_at, users!inner(email)')
    .single()

  if (error) throw new Error(error.message)

  // Email notification — fire and forget, don't block on failure
  sendCommentEmail({
    isAdmin: userProfile?.role === 'admin',
    posterEmail: user.email!,
    deliverableTitle: deliverable?.title ?? 'a deliverable',
    deliverableClientId: deliverable?.client_id,
    body,
    supabase,
  }).catch((err) => console.error('Email notification failed:', err))

  return comment as unknown as CommentWithUser
}

export async function resolveComment(commentId: string, resolved: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('comments')
    .update({ resolved })
    .eq('id', commentId)

  if (error) throw new Error(error.message)
}

// ── Email helpers ────────────────────────────────────────────────────────────

async function sendCommentEmail({
  isAdmin,
  posterEmail,
  deliverableTitle,
  deliverableClientId,
  body,
  supabase,
}: {
  isAdmin: boolean
  posterEmail: string
  deliverableTitle: string
  deliverableClientId?: string
  body: string
  supabase: Awaited<ReturnType<typeof createClient>>
}) {
  if (isAdmin && deliverableClientId) {
    const { data: clientUser } = await supabase
      .from('users')
      .select('email')
      .eq('client_id', deliverableClientId)
      .eq('role', 'client')
      .limit(1)
      .single()

    if (clientUser) {
      await sendEmail({
        to: clientUser.email,
        subject: `New comment on "${deliverableTitle}"`,
        html: `<p>Your LVL3 team left a comment on <strong>${deliverableTitle}</strong>:</p><blockquote>${body}</blockquote>`,
      })
    }
  } else {
    await sendEmail({
      to: 'hello@lvl3.com',
      subject: `Client comment on "${deliverableTitle}"`,
      html: `<p><strong>${posterEmail}</strong> commented on <strong>${deliverableTitle}</strong>:</p><blockquote>${body}</blockquote>`,
    })
  }
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'LVL3 Portal <portal@lvl3.com>',
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend API error: ${text}`)
  }
}
