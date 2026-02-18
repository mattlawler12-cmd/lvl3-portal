import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Settings } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { getClientUsers } from '@/app/actions/clients'
import ClientUsersTable from '@/components/clients/client-users-table'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params

  await requireAdmin()

  const service = await createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const users = await getClientUsers(id)

  return (
    <div className="p-8 max-w-4xl">
      {/* Back nav */}
      <Link
        href="/clients"
        className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors mb-6"
      >
        <ChevronLeft size={15} />
        All clients
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        {client.logo_url ? (
          <img
            src={client.logo_url}
            alt={client.name}
            className="w-14 h-14 rounded-xl object-contain bg-zinc-800 flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">
              {client.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-2xl font-bold">{client.name}</h1>
          <p className="text-zinc-500 text-sm font-mono">{client.slug}</p>
        </div>
        <a
          href={`/clients/${id}/settings`}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors border border-zinc-800 rounded-lg px-3 py-1.5"
        >
          <Settings size={14} />
          Settings
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Users', value: users.length },
          {
            label: 'Google Sheet',
            value: client.google_sheet_id ? 'Connected' : 'Not set',
          },
          {
            label: 'Looker Embed',
            value: client.looker_embed_url ? 'Connected' : 'Not set',
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4"
          >
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className="text-white font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <ClientUsersTable users={users} clientId={id} clientName={client.name} />
    </div>
  )
}
