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
