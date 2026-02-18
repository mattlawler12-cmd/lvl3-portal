import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type AuthUser = {
  id: string
  email: string
  role: 'admin' | 'member' | 'client'
  client_id: string | null
}

export async function requireAuth(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  user: AuthUser
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, client_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return {
    supabase,
    user: {
      id: user.id,
      email: user.email!,
      role: profile.role as 'admin' | 'member' | 'client',
      client_id: profile.client_id as string | null,
    },
  }
}

export async function requireAdmin() {
  const result = await requireAuth()
  if (result.user.role !== 'admin') redirect('/')
  return result
}
