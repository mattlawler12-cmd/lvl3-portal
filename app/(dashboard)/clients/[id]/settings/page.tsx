import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import ClientSettingsForm from '@/components/clients/ClientSettingsForm'

interface Props {
  params: Promise<{ id: string }>
}

function getServiceAccountEmail(): string | null {
  try {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!raw) return null
    const cleaned = raw.trim().replace(/^['"]|['"]$/g, '')
    const parsed = JSON.parse(cleaned)
    return parsed?.client_email ?? null
  } catch {
    return null
  }
}

export default async function ClientSettingsPage({ params }: Props) {
  const { id } = await params

  await requireAdmin()

  const service = await createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select(
      'id, name, slug, logo_url, google_sheet_id, looker_embed_url, sheet_header_row, sheet_column_map, ga4_property_id, gsc_site_url'
    )
    .eq('id', id)
    .single()

  if (!client) notFound()

  const serviceAccountEmail = getServiceAccountEmail()

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
      <p className="text-zinc-500 text-sm mb-8">
        Update details and integrations for {client.name}.
      </p>

      <ClientSettingsForm
        client={{
          id: client.id,
          name: client.name,
          slug: client.slug,
          logo_url: client.logo_url ?? null,
          google_sheet_id: client.google_sheet_id ?? null,
          looker_embed_url: client.looker_embed_url ?? null,
          sheet_header_row: (client.sheet_header_row as number | null) ?? null,
          sheet_column_map: (client.sheet_column_map as Record<string, string> | null) ?? null,
          ga4_property_id: (client.ga4_property_id as string | null) ?? null,
          gsc_site_url: (client.gsc_site_url as string | null) ?? null,
        }}
        serviceAccountEmail={serviceAccountEmail}
      />
    </div>
  )
}
