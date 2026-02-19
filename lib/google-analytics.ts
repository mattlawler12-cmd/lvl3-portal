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

export type GA4Metrics = {
  sessions: number
  users: number
  pageviews: number
  bounceRate: number
  topChannels: { channel: string; sessions: number }[]
  sessionsDelta: number
  usersDelta: number
  pageviewsDelta: number
}

export async function fetchGA4Metrics(propertyId: string): Promise<GA4Metrics> {
  const credentials = getCredentials()

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  })

  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth })

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const endDate = fmt(new Date(today.getTime() - 86400000))
  const startDate30 = fmt(new Date(today.getTime() - 31 * 86400000))
  const priorEnd = fmt(new Date(today.getTime() - 32 * 86400000))
  const priorStart = fmt(new Date(today.getTime() - 61 * 86400000))

  const [currentRes, priorRes, channelRes] = await Promise.all([
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: startDate30, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
        ],
      },
    }),
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: priorStart, endDate: priorEnd }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
        ],
      },
    }),
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: startDate30, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '5',
      },
    }),
  ])

  const cur = currentRes.data.rows?.[0]?.metricValues ?? []
  const pri = priorRes.data.rows?.[0]?.metricValues ?? []

  const sessions = parseInt(cur[0]?.value ?? '0')
  const users = parseInt(cur[1]?.value ?? '0')
  const pageviews = parseInt(cur[2]?.value ?? '0')
  const bounceRate = parseFloat(cur[3]?.value ?? '0')

  const priorSessions = parseInt(pri[0]?.value ?? '0')
  const priorUsers = parseInt(pri[1]?.value ?? '0')
  const priorPageviews = parseInt(pri[2]?.value ?? '0')

  const pct = (curr: number, prior: number) =>
    prior === 0 ? 0 : Math.round(((curr - prior) / prior) * 100)

  const topChannels = (channelRes.data.rows ?? []).map((row) => ({
    channel: row.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: parseInt(row.metricValues?.[0]?.value ?? '0'),
  }))

  return {
    sessions,
    users,
    pageviews,
    bounceRate,
    topChannels,
    sessionsDelta: pct(sessions, priorSessions),
    usersDelta: pct(users, priorUsers),
    pageviewsDelta: pct(pageviews, priorPageviews),
  }
}

// ── Dashboard report types ────────────────────────────────────────────────────

export type ChannelRow = { channel: string; sessions: number; sessionsDelta: number }
export type MonthlySessionPoint = { month: string; yearMonth: string; sessions: number }
export type SourceMediumRow = { sourceMedium: string; sessions: number; users: number }
export type LandingPageRow = { page: string; sessions: number; sessionsDelta: number }

export type GA4Report = {
  sessions: number; sessionsDelta: number; sessionsYoYDelta: number
  purchaseRevenue: number; purchaseRevenueDelta: number
  transactions: number; transactionsDelta: number
  topChannels: ChannelRow[]
  monthlyTrend: MonthlySessionPoint[]
  topSourceMediums: SourceMediumRow[]
  organicSessions: number; organicSessionsDelta: number
  organicUsers: number; organicUsersDelta: number
  organicTransactions: number; organicTransactionsDelta: number
  deviceBreakdown: { mobile: number; desktop: number; tablet: number }
  organicLandingPages: LandingPageRow[]
}

export async function fetchGA4Report(propertyId: string): Promise<GA4Report> {
  const credentials = getCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  })
  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth })

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  // Current 28-day window: yesterday back 28 days
  const endDate = fmt(new Date(today.getTime() - 86400000))
  const startDate = fmt(new Date(today.getTime() - 29 * 86400000))
  // Prior 28-day window
  const priorEnd = fmt(new Date(today.getTime() - 30 * 86400000))
  const priorStart = fmt(new Date(today.getTime() - 57 * 86400000))
  // YoY: same 28 days one year prior
  const yoyEnd = fmt(new Date(today.getTime() - 365 * 86400000 - 86400000))
  const yoyStart = fmt(new Date(today.getTime() - 365 * 86400000 - 29 * 86400000))

  // 6-month monthly trend: first day of (currentMonth - 6) to last day of prior month
  const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthlyEnd = fmt(new Date(firstOfCurrentMonth.getTime() - 86400000))
  const monthlyStartDate = new Date(today.getFullYear(), today.getMonth() - 6, 1)
  const monthlyStart = fmt(monthlyStartDate)

  const prop = `properties/${propertyId}`

  const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.allSettled([
    // 1: current 28-day overall
    analyticsdata.properties.runReport({
      property: prop,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'sessions' }, { name: 'purchaseRevenue' }, { name: 'transactions' }],
      },
    }),
    // 2: prior 28-day overall
    analyticsdata.properties.runReport({
      property: prop,
      requestBody: {
        dateRanges: [{ startDate: priorStart, endDate: priorEnd }],
        metrics: [{ name: 'sessions' }, { name: 'purchaseRevenue' }, { name: 'transactions' }],
      },
    }),
    // 3: YoY overall
    analyticsdata.properties.runReport({
      property: prop,
      requestBody: {
        dateRanges: [{ startDate: yoyStart, endDate: yoyEnd }],
        metrics: [{ name: 'sessions' }, { name: 'purchaseRevenue' }, { name: 'transactions' }],
      },
    }),
    // 4: channel group — two date ranges in one call
    analyticsdata.properties.runReport({
      property: prop,
      requestBody: {
        dateRanges: [
          { startDate, endDate, name: 'current' },
          { startDate: priorStart, endDate: priorEnd, name: 'prior' },
        ],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }, { name: 'dateRange' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '20',
      },
    }),
    // 5: monthly sessions trend
    analyticsdata.properties.runReport({
      property: prop,
      requestBody: {
        dateRanges: [{ startDate: monthlyStart, endDate: monthlyEnd }],
        dimensions: [{ name: 'yearMonth' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: false }],
      },
    }),
    // 6: source/medium
    analyticsdata.properties.runReport({
      property: prop,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSourceMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '25',
      },
    }),
    // 7: organic device breakdown — two date ranges
    analyticsdata.properties.runReport({
      property: prop,
      requestBody: {
        dateRanges: [
          { startDate, endDate, name: 'current' },
          { startDate: priorStart, endDate: priorEnd, name: 'prior' },
        ],
        dimensions: [{ name: 'deviceCategory' }, { name: 'dateRange' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'transactions' }],
        dimensionFilter: {
          filter: {
            fieldName: 'sessionDefaultChannelGroup',
            stringFilter: { matchType: 'EXACT', value: 'Organic Search' },
          },
        },
      },
    }),
    // 8: organic landing pages — two date ranges
    analyticsdata.properties.runReport({
      property: prop,
      requestBody: {
        dateRanges: [
          { startDate, endDate, name: 'current' },
          { startDate: priorStart, endDate: priorEnd, name: 'prior' },
        ],
        dimensions: [{ name: 'landingPagePlusQueryString' }, { name: 'dateRange' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: {
          filter: {
            fieldName: 'sessionDefaultChannelGroup',
            stringFilter: { matchType: 'EXACT', value: 'Organic Search' },
          },
        },
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '50',
      },
    }),
  ])

  const pct = (curr: number, prior: number) =>
    prior === 0 ? 0 : Math.round(((curr - prior) / prior) * 100)

  // Parse overall metrics
  const cur1 = r1.status === 'fulfilled' ? (r1.value.data.rows?.[0]?.metricValues ?? []) : []
  const cur2 = r2.status === 'fulfilled' ? (r2.value.data.rows?.[0]?.metricValues ?? []) : []
  const cur3 = r3.status === 'fulfilled' ? (r3.value.data.rows?.[0]?.metricValues ?? []) : []

  const sessions = parseInt(cur1[0]?.value ?? '0')
  const purchaseRevenue = parseFloat(cur1[1]?.value ?? '0')
  const transactions = parseInt(cur1[2]?.value ?? '0')
  const priorSessions = parseInt(cur2[0]?.value ?? '0')
  const priorRevenue = parseFloat(cur2[1]?.value ?? '0')
  const priorTransactions = parseInt(cur2[2]?.value ?? '0')
  const yoySessions = parseInt(cur3[0]?.value ?? '0')

  // Parse channels (call 4) — split by dateRange dimension
  const channelCurrentMap = new Map<string, number>()
  const channelPriorMap = new Map<string, number>()
  if (r4.status === 'fulfilled') {
    for (const row of r4.value.data.rows ?? []) {
      const ch = row.dimensionValues?.[0]?.value ?? ''
      const dr = row.dimensionValues?.[1]?.value ?? ''
      const s = parseInt(row.metricValues?.[0]?.value ?? '0')
      if (dr === 'current') channelCurrentMap.set(ch, (channelCurrentMap.get(ch) ?? 0) + s)
      else channelPriorMap.set(ch, (channelPriorMap.get(ch) ?? 0) + s)
    }
  }
  const topChannels: ChannelRow[] = Array.from(channelCurrentMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([channel, s]) => ({
      channel,
      sessions: s,
      sessionsDelta: pct(s, channelPriorMap.get(channel) ?? 0),
    }))

  // Parse monthly trend (call 5)
  const monthlyTrend: MonthlySessionPoint[] = []
  if (r5.status === 'fulfilled') {
    for (const row of r5.value.data.rows ?? []) {
      const ym = row.dimensionValues?.[0]?.value ?? ''
      const s = parseInt(row.metricValues?.[0]?.value ?? '0')
      if (ym.length === 6) {
        const yr = parseInt(ym.slice(0, 4))
        const mo = parseInt(ym.slice(4, 6)) - 1
        const label = new Date(yr, mo, 1).toLocaleString('en-US', { month: 'short' })
        monthlyTrend.push({ month: label, yearMonth: ym, sessions: s })
      }
    }
  }

  // Parse source/medium (call 6)
  const topSourceMediums: SourceMediumRow[] = []
  if (r6.status === 'fulfilled') {
    for (const row of r6.value.data.rows ?? []) {
      topSourceMediums.push({
        sourceMedium: row.dimensionValues?.[0]?.value ?? '',
        sessions: parseInt(row.metricValues?.[0]?.value ?? '0'),
        users: parseInt(row.metricValues?.[1]?.value ?? '0'),
      })
    }
  }

  // Parse organic device breakdown (call 7)
  const deviceCurrentMap = new Map<string, { sessions: number; users: number; transactions: number }>()
  const devicePriorMap = new Map<string, { sessions: number; users: number; transactions: number }>()
  if (r7.status === 'fulfilled') {
    for (const row of r7.value.data.rows ?? []) {
      const dev = (row.dimensionValues?.[0]?.value ?? '').toLowerCase()
      const dr = row.dimensionValues?.[1]?.value ?? ''
      const s = parseInt(row.metricValues?.[0]?.value ?? '0')
      const u = parseInt(row.metricValues?.[1]?.value ?? '0')
      const t = parseInt(row.metricValues?.[2]?.value ?? '0')
      const map = dr === 'current' ? deviceCurrentMap : devicePriorMap
      const prev = map.get(dev) ?? { sessions: 0, users: 0, transactions: 0 }
      map.set(dev, { sessions: prev.sessions + s, users: prev.users + u, transactions: prev.transactions + t })
    }
  }

  const organicSessions = Array.from(deviceCurrentMap.values()).reduce((s, v) => s + v.sessions, 0)
  const organicUsers = Array.from(deviceCurrentMap.values()).reduce((s, v) => s + v.users, 0)
  const organicTransactions = Array.from(deviceCurrentMap.values()).reduce((s, v) => s + v.transactions, 0)
  const priorOrganicSessions = Array.from(devicePriorMap.values()).reduce((s, v) => s + v.sessions, 0)
  const priorOrganicUsers = Array.from(devicePriorMap.values()).reduce((s, v) => s + v.users, 0)
  const priorOrganicTransactions = Array.from(devicePriorMap.values()).reduce((s, v) => s + v.transactions, 0)

  const deviceBreakdown = {
    mobile: deviceCurrentMap.get('mobile')?.sessions ?? 0,
    desktop: deviceCurrentMap.get('desktop')?.sessions ?? 0,
    tablet: deviceCurrentMap.get('tablet')?.sessions ?? 0,
  }

  // Parse organic landing pages (call 8)
  const lpCurrentMap = new Map<string, number>()
  const lpPriorMap = new Map<string, number>()
  if (r8.status === 'fulfilled') {
    for (const row of r8.value.data.rows ?? []) {
      const page = row.dimensionValues?.[0]?.value ?? ''
      const dr = row.dimensionValues?.[1]?.value ?? ''
      const s = parseInt(row.metricValues?.[0]?.value ?? '0')
      if (dr === 'current') lpCurrentMap.set(page, (lpCurrentMap.get(page) ?? 0) + s)
      else lpPriorMap.set(page, (lpPriorMap.get(page) ?? 0) + s)
    }
  }
  const organicLandingPages: LandingPageRow[] = Array.from(lpCurrentMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([page, s]) => ({
      page,
      sessions: s,
      sessionsDelta: pct(s, lpPriorMap.get(page) ?? 0),
    }))

  return {
    sessions, sessionsDelta: pct(sessions, priorSessions), sessionsYoYDelta: pct(sessions, yoySessions),
    purchaseRevenue, purchaseRevenueDelta: pct(purchaseRevenue, priorRevenue),
    transactions, transactionsDelta: pct(transactions, priorTransactions),
    topChannels, monthlyTrend, topSourceMediums,
    organicSessions, organicSessionsDelta: pct(organicSessions, priorOrganicSessions),
    organicUsers, organicUsersDelta: pct(organicUsers, priorOrganicUsers),
    organicTransactions, organicTransactionsDelta: pct(organicTransactions, priorOrganicTransactions),
    deviceBreakdown, organicLandingPages,
  }
}
