import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import { getClientListForUser, getSelectedClientId } from '@/lib/client-resolution'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, client_id')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'member') as 'admin' | 'member' | 'client'
  const isAdmin = role === 'admin'

  // Fetch client list for sidebar dropdown
  const { clientList, autoSelectedClientId, showSelector } =
    await getClientListForUser(user.id, role, profile?.client_id ?? null)

  // Read cookie-based selection (ignored for client-role users)
  const cookieClientId = await getSelectedClientId()

  let selectedClientId: string | null
  if (role === 'client') {
    selectedClientId = autoSelectedClientId
  } else {
    // Validate cookie value against the user's accessible clients
    selectedClientId =
      cookieClientId && clientList.some((c) => c.id === cookieClientId)
        ? cookieClientId
        : null
  }

  return (
    <div className="flex min-h-screen bg-zinc-900">
      <Sidebar
        userEmail={user.email ?? ''}
        isAdmin={isAdmin}
        clientList={clientList}
        selectedClientId={selectedClientId}
        showClientSelector={showSelector}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
