import { google } from 'googleapis'

function getCredentials() {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var is not set')
  raw = raw.trim()
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    raw = raw.slice(1, -1)
  }
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Error: ${e instanceof Error ? e.message : String(e)}`
    )
  }
}

export type GSCMetrics = {
  clicks: number
  impressions: number
  ctr: number
  position: number
  topQueries: { query: string; clicks: number; impressions: number }[]
}

export async function fetchGSCMetrics(siteUrl: string): Promise<GSCMetrics> {
  const credentials = getCredentials()

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })

  const searchconsole = google.searchconsole({ version: 'v1', auth })

  const today = new Date()
  const endDate = new Date(today.getTime() - 86400000).toISOString().slice(0, 10)
  const startDate = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10)

  const [overallRes, queriesRes] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: [],
      },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 10,
      },
    }),
  ])

  const overall = overallRes.data.rows?.[0] ?? {}
  const clicks = overall.clicks ?? 0
  const impressions = overall.impressions ?? 0
  const ctr = (overall.ctr ?? 0) * 100
  const position = overall.position ?? 0

  const topQueries = (queriesRes.data.rows ?? []).map((row) => ({
    query: row.keys?.[0] ?? '',
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
  }))

  return { clicks, impressions, ctr, position, topQueries }
}
