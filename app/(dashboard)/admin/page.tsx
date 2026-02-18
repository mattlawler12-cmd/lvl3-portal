import { requireAdmin } from '@/lib/auth'

export default async function AdminPage() {
  await requireAdmin()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Admin</h1>
      <p className="mt-1 text-zinc-400 text-sm">Manage clients, users, and content.</p>
    </div>
  )
}
