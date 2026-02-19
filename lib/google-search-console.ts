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

export async function listGSCSites(): Promise<string[]> {
  const credentials = getCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  const searchconsole = google.searchconsole({ version: 'v1', auth })
  const { data } = await searchconsole.sites.list()
  return (data.siteEntry ?? [])
    .map((s) => s.siteUrl ?? '')
    .filter(Boolean)
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

// ── Dashboard report types ────────────────────────────────────────────────────

export type GSCMonthlyPoint = { month: string; yearMonth: string; clicks: number; impressions: number }
export type QueryRow = { query: string; clicks: number; clicksDelta: number; impressions: number; impressionsDelta: number; position: number }
export type UrlRow = { page: string; clicks: number; clicksDelta: number; impressions: number; position: number }

export type GSCReport = {
  clicks: number; clicksDelta: number; clicksYoYDelta: number
  impressions: number; impressionsDelta: number; impressionsYoYDelta: number
  position: number; positionDelta: number; positionYoYDelta: number
  ctr: number
  monthlyTrend: GSCMonthlyPoint[]
  topQueries: QueryRow[]
  topUrls: UrlRow[]
}

export async function fetchGSCReport(siteUrl: string): Promise<GSCReport> {
  const credentials = getCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  const searchconsole = google.searchconsole({ version: 'v1', auth })

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const endDate = fmt(new Date(today.getTime() - 86400000))
  const startDate = fmt(new Date(today.getTime() - 29 * 86400000))
  const priorEnd = fmt(new Date(today.getTime() - 30 * 86400000))
  const priorStart = fmt(new Date(today.getTime() - 57 * 86400000))
  const yoyEnd = fmt(new Date(today.getTime() - 365 * 86400000 - 86400000))
  const yoyStart = fmt(new Date(today.getTime() - 365 * 86400000 - 29 * 86400000))

  // 6-month daily range for monthly aggregation
  const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthlyEnd = fmt(new Date(firstOfCurrentMonth.getTime() - 86400000))
  const monthlyStart = fmt(new Date(today.getFullYear(), today.getMonth() - 6, 1))

  const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.allSettled([
    // 1: current 28-day overall
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate, endDate, dimensions: [] } }),
    // 2: prior 28-day overall
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate: priorStart, endDate: priorEnd, dimensions: [] } }),
    // 3: YoY overall
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate: yoyStart, endDate: yoyEnd, dimensions: [] } }),
    // 4: daily data for monthly aggregation
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate: monthlyStart, endDate: monthlyEnd, dimensions: ['date'], rowLimit: 200 } }),
    // 5: top queries current
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: 25 } }),
    // 6: top queries prior (for delta)
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate: priorStart, endDate: priorEnd, dimensions: ['query'], rowLimit: 100 } }),
    // 7: top pages current
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate, endDate, dimensions: ['page'], rowLimit: 25 } }),
    // 8: top pages prior (for delta)
    searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate: priorStart, endDate: priorEnd, dimensions: ['page'], rowLimit: 100 } }),
  ])

  // Overall metrics
  const overall = r1.status === 'fulfilled' ? (r1.value.data.rows?.[0] ?? {}) : {}
  const priorOverall = r2.status === 'fulfilled' ? (r2.value.data.rows?.[0] ?? {}) : {}
  const yoyOverall = r3.status === 'fulfilled' ? (r3.value.data.rows?.[0] ?? {}) : {}

  const clicks = (overall as { clicks?: number }).clicks ?? 0
  const impressions = (overall as { impressions?: number }).impressions ?? 0
  const position = (overall as { position?: number }).position ?? 0
  const ctr = ((overall as { ctr?: number }).ctr ?? 0) * 100

  const priorClicks = (priorOverall as { clicks?: number }).clicks ?? 0
  const priorImpressions = (priorOverall as { impressions?: number }).impressions ?? 0
  const priorPosition = (priorOverall as { position?: number }).position ?? 0

  const yoyClicks = (yoyOverall as { clicks?: number }).clicks ?? 0
  const yoyImpressions = (yoyOverall as { impressions?: number }).impressions ?? 0
  const yoyPosition = (yoyOverall as { position?: number }).position ?? 0

  const pct = (curr: number, prior: number) =>
    prior === 0 ? 0 : Math.round(((curr - prior) / prior) * 100)

  // Monthly trend: aggregate daily rows by yearMonth
  const monthlyMap = new Map<string, { clicks: number; impressions: number }>()
  if (r4.status === 'fulfilled') {
    for (const row of r4.value.data.rows ?? []) {
      const dateStr = row.keys?.[0] ?? ''
      const ym = dateStr.slice(0, 7).replace('-', '') // "2025-01" -> "202501"
      const prev = monthlyMap.get(ym) ?? { clicks: 0, impressions: 0 }
      monthlyMap.set(ym, {
        clicks: prev.clicks + (row.clicks ?? 0),
        impressions: prev.impressions + (row.impressions ?? 0),
      })
    }
  }
  const monthlyTrend: GSCMonthlyPoint[] = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, data]) => {
      const yr = parseInt(ym.slice(0, 4))
      const mo = parseInt(ym.slice(4, 6)) - 1
      const label = new Date(yr, mo, 1).toLocaleString('en-US', { month: 'short' })
      return { month: label, yearMonth: ym, ...data }
    })

  // Queries
  const priorQueryMap = new Map<string, { clicks: number; impressions: number }>()
  if (r6.status === 'fulfilled') {
    for (const row of r6.value.data.rows ?? []) {
      priorQueryMap.set(row.keys?.[0] ?? '', { clicks: row.clicks ?? 0, impressions: row.impressions ?? 0 })
    }
  }
  const topQueries: QueryRow[] = []
  if (r5.status === 'fulfilled') {
    for (const row of r5.value.data.rows ?? []) {
      const q = row.keys?.[0] ?? ''
      const prior = priorQueryMap.get(q)
      topQueries.push({
        query: q,
        clicks: row.clicks ?? 0,
        clicksDelta: (row.clicks ?? 0) - (prior?.clicks ?? 0),
        impressions: row.impressions ?? 0,
        impressionsDelta: (row.impressions ?? 0) - (prior?.impressions ?? 0),
        position: row.position ?? 0,
      })
    }
  }

  // URLs
  const priorUrlMap = new Map<string, { clicks: number; impressions: number }>()
  if (r8.status === 'fulfilled') {
    for (const row of r8.value.data.rows ?? []) {
      priorUrlMap.set(row.keys?.[0] ?? '', { clicks: row.clicks ?? 0, impressions: row.impressions ?? 0 })
    }
  }
  const topUrls: UrlRow[] = []
  if (r7.status === 'fulfilled') {
    for (const row of r7.value.data.rows ?? []) {
      const page = row.keys?.[0] ?? ''
      const prior = priorUrlMap.get(page)
      topUrls.push({
        page,
        clicks: row.clicks ?? 0,
        clicksDelta: (row.clicks ?? 0) - (prior?.clicks ?? 0),
        impressions: row.impressions ?? 0,
        position: row.position ?? 0,
      })
    }
  }

  return {
    clicks, clicksDelta: pct(clicks, priorClicks), clicksYoYDelta: pct(clicks, yoyClicks),
    impressions, impressionsDelta: pct(impressions, priorImpressions), impressionsYoYDelta: pct(impressions, yoyImpressions),
    position, positionDelta: pct(position, priorPosition), positionYoYDelta: pct(position, yoyPosition),
    ctr, monthlyTrend, topQueries, topUrls,
  }
}
