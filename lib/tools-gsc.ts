import { getAdminOAuthClient } from '@/lib/google-auth'
import { google } from 'googleapis'

export type GSCRow = {
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export async function fetchGSCRows(
  siteUrl: string,
  days = 90
): Promise<GSCRow[]> {
  const auth = await getAdminOAuthClient()
  const searchconsole = google.searchconsole({ version: 'v1', auth })

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const endDate = fmt(new Date(today.getTime() - 86400000))
  const startDate = fmt(new Date(today.getTime() - days * 86400000))

  const { data } = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      rowLimit: 25000,
    },
  })

  return (data.rows ?? []).map((row) => ({
    query: row.keys?.[0] ?? '',
    page: row.keys?.[1] ?? '',
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: (row.ctr ?? 0) * 100,
    position: row.position ?? 0,
  }))
}
