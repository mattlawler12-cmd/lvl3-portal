'use server'

import { unstable_cache } from 'next/cache'
import { revalidateTag, revalidatePath } from 'next/cache'
import { fetchSheetRows, SheetRow } from '@/lib/google-sheets'
import {
  createClient as createSupabaseClient,
  createServiceClient,
} from '@/lib/supabase/server'
import { generateClientSummary } from '@/app/actions/summaries'

export type { SheetRow }

export type SheetData = {
  rows: SheetRow[]
  fetchedAt: string
}

export async function getSheetData(sheetId: string): Promise<SheetData> {
  const cached = unstable_cache(
    async () => {
      const rows = await fetchSheetRows(sheetId)
      return {
        rows,
        fetchedAt: new Date().toISOString(),
      }
    },
    ['sheet', sheetId],
    {
      revalidate: 300,
      tags: [`sheet-${sheetId}`],
    }
  )

  return cached()
}

export async function syncSheet(clientId: string): Promise<void> {
  const supabase = await createSupabaseClient()
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

  const service = await createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('google_sheet_id')
    .eq('id', clientId)
    .single()

  if (client?.google_sheet_id) {
    revalidateTag(`sheet-${client.google_sheet_id}`)
  }

  revalidatePath('/projects')

  await generateClientSummary(clientId)
}
