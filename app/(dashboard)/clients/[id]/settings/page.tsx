import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { updateClient } from '@/app/actions/clients'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientSettingsPage({ params }: Props) {
  const { id } = await params

  await requireAdmin()

  const service = await createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  async function handleUpdate(formData: FormData) {
    'use server'
    await updateClient(id, formData)
    redirect(`/clients/${id}`)
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/clients/${id}`}
        className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors mb-6"
      >
        <ChevronLeft size={15} />
        {client.name}
      </Link>

      <h1 className="text-white text-2xl font-bold mb-1">Client Settings</h1>
      <p className="text-zinc-500 text-sm mb-8">Update details and integrations for {client.name}.</p>

      <form action={handleUpdate} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Basic Info</h2>

          <div>
            <label className="block text-zinc-400 text-sm mb-1.5" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={client.name}
              required
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-1.5" htmlFor="slug">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              defaultValue={client.slug}
              required
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-1.5" htmlFor="logo_url">
              Logo URL
            </label>
            <input
              id="logo_url"
              name="logo_url"
              type="url"
              defaultValue={client.logo_url ?? ''}
              placeholder="https://..."
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
            />
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Integrations</h2>

          <div>
            <label className="block text-zinc-400 text-sm mb-1.5" htmlFor="google_sheet_id">
              Google Sheet ID
            </label>
            <input
              id="google_sheet_id"
              name="google_sheet_id"
              type="text"
              defaultValue={client.google_sheet_id ?? ''}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600 font-mono"
            />
            <p className="text-zinc-600 text-xs mt-1.5">
              Found in the sheet URL: docs.google.com/spreadsheets/d/<span className="text-zinc-400">SHEET_ID</span>/edit
            </p>
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-1.5" htmlFor="looker_embed_url">
              Looker Studio Embed URL
            </label>
            <input
              id="looker_embed_url"
              name="looker_embed_url"
              type="url"
              defaultValue={client.looker_embed_url ?? ''}
              placeholder="https://lookerstudio.google.com/embed/reporting/..."
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-zinc-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Save Changes
          </button>
          <Link
            href={`/clients/${id}`}
            className="text-zinc-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
