import { getAdminOAuthClient } from '@/lib/google-auth'
import { google } from 'googleapis'

// ── GSC flexible fetch ────────────────────────────────────────────────────────

export type GSCToolRow = {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export async function gscQuery(params: {
  siteUrl: string
  startDate: string
  endDate: string
  dimensions: string[]
  rowLimit?: number
}): Promise<GSCToolRow[]> {
  const auth = await getAdminOAuthClient()
  const searchconsole = google.searchconsole({ version: 'v1', auth })

  const { data } = await searchconsole.searchanalytics.query({
    siteUrl: params.siteUrl,
    requestBody: {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions,
      rowLimit: params.rowLimit ?? 1000,
    },
  })

  return (data.rows ?? []).map((row) => ({
    keys: row.keys ?? [],
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: Math.round((row.ctr ?? 0) * 10000) / 100,
    position: Math.round((row.position ?? 0) * 10) / 10,
  }))
}

// ── GA4 flexible fetch ────────────────────────────────────────────────────────

export type GA4ToolRow = {
  dimensions: string[]
  metrics: number[]
}

export async function ga4Query(params: {
  propertyId: string
  startDate: string
  endDate: string
  metrics: string[]
  dimensions?: string[]
  rowLimit?: number
}): Promise<GA4ToolRow[]> {
  const auth = await getAdminOAuthClient()
  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth })

  const { data } = await analyticsdata.properties.runReport({
    property: `properties/${params.propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
      metrics: params.metrics.map((name) => ({ name })),
      dimensions: (params.dimensions ?? []).map((name) => ({ name })),
      limit: String(params.rowLimit ?? 1000),
    },
  })

  return (data.rows ?? []).map((row) => ({
    dimensions: (row.dimensionValues ?? []).map((d) => d.value ?? ''),
    metrics: (row.metricValues ?? []).map((m) => parseFloat(m.value ?? '0')),
  }))
}
