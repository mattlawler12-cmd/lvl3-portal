import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GBPAccount {
  name: string          // resource name e.g. "accounts/123456"
  accountName: string   // display name
  type: string
}

export interface GBPAddress {
  addressLines: string[]
  locality: string      // city
  administrativeArea: string  // state
  postalCode: string
  regionCode: string    // country code
}

export interface GBPHoursPeriod {
  openDay: string
  openTime: { hours: number; minutes?: number }
  closeDay: string
  closeTime: { hours: number; minutes?: number }
}

export interface GBPLocation {
  name: string          // resource name e.g. "locations/456"
  title: string         // business name
  primaryPhone: string | null
  additionalPhones: string[]
  websiteUri: string | null
  address: GBPAddress | null
  primaryCategory: string | null
  description: string | null
  openStatus: 'OPEN' | 'CLOSED_PERMANENTLY' | 'CLOSED_TEMPORARILY' | 'UNKNOWN'
  hasRegularHours: boolean
  hoursPeriods: GBPHoursPeriod[]
  mapsUri: string | null
  newReviewUri: string | null
}

export interface LocationAudit extends GBPLocation {
  score: number
  issues: string[]
  addressFormatted: string
}

// ── API helpers ────────────────────────────────────────────────────────────────

export async function listGBPAccounts(auth: OAuth2Client): Promise<GBPAccount[]> {
  const api = google.mybusinessaccountmanagement({ version: 'v1', auth })
  const res = await api.accounts.list()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts: any[] = res.data.accounts ?? []
  return accounts.map((a) => ({
    name: a.name ?? '',
    accountName: a.accountName ?? a.name ?? '',
    type: a.type ?? 'PERSONAL',
  }))
}

const LOCATION_READ_MASK = [
  'name',
  'title',
  'phoneNumbers',
  'storefrontAddress',
  'websiteUri',
  'regularHours',
  'primaryCategory',
  'profile',
  'openInfo',
  'metadata',
].join(',')

export async function listGBPLocations(
  accountName: string,
  auth: OAuth2Client,
): Promise<GBPLocation[]> {
  const api = google.mybusinessbusinessinformation({ version: 'v1', auth })
  const locations: GBPLocation[] = []
  let pageToken: string | undefined

  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await (api.accounts.locations.list as any)({
      parent: accountName,
      readMask: LOCATION_READ_MASK,
      pageSize: 100,
      ...(pageToken ? { pageToken } : {}),
    })

    const raw = res.data.locations ?? []
    for (const loc of raw) {
      locations.push(parseLocation(loc))
    }

    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  return locations
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLocation(loc: any): GBPLocation {
  const addr = loc.storefrontAddress ?? null
  const phones = loc.phoneNumbers ?? {}
  const hours = loc.regularHours?.periods ?? []
  const openStatus: GBPLocation['openStatus'] =
    loc.openInfo?.status === 'CLOSED_PERMANENTLY'
      ? 'CLOSED_PERMANENTLY'
      : loc.openInfo?.status === 'CLOSED_TEMPORARILY'
      ? 'CLOSED_TEMPORARILY'
      : loc.openInfo?.status === 'OPEN'
      ? 'OPEN'
      : 'UNKNOWN'

  return {
    name: loc.name ?? '',
    title: loc.title ?? '',
    primaryPhone: phones.primaryPhone ?? null,
    additionalPhones: phones.additionalPhones ?? [],
    websiteUri: loc.websiteUri ?? null,
    address: addr
      ? {
          addressLines: addr.addressLines ?? [],
          locality: addr.locality ?? '',
          administrativeArea: addr.administrativeArea ?? '',
          postalCode: addr.postalCode ?? '',
          regionCode: addr.regionCode ?? '',
        }
      : null,
    primaryCategory: loc.primaryCategory?.displayName ?? null,
    description: loc.profile?.description ?? null,
    openStatus,
    hasRegularHours: hours.length > 0,
    hoursPeriods: hours,
    mapsUri: loc.metadata?.mapsUri ?? null,
    newReviewUri: loc.metadata?.newReviewUri ?? null,
  }
}

// ── Audit ──────────────────────────────────────────────────────────────────────

export function auditLocation(loc: GBPLocation): LocationAudit {
  const issues: string[] = []
  let score = 100

  if (!loc.primaryPhone) {
    issues.push('No primary phone number')
    score -= 20
  }
  if (!loc.websiteUri) {
    issues.push('No website URL')
    score -= 15
  }
  if (!loc.hasRegularHours) {
    issues.push('No business hours set')
    score -= 20
  }
  if (!loc.description) {
    issues.push('No business description')
    score -= 15
  }
  if (!loc.primaryCategory) {
    issues.push('No primary category set')
    score -= 10
  }
  if (!loc.address) {
    issues.push('No storefront address')
    score -= 15
  }
  if (loc.openStatus === 'CLOSED_PERMANENTLY') {
    issues.push('Marked as permanently closed')
    score -= 30
  }
  if (loc.openStatus === 'CLOSED_TEMPORARILY') {
    issues.push('Marked as temporarily closed')
    score -= 10
  }

  const addr = loc.address
  const addressFormatted = addr
    ? [
        addr.addressLines.join(', '),
        addr.locality,
        addr.administrativeArea,
        addr.postalCode,
      ]
        .filter(Boolean)
        .join(', ')
    : ''

  return {
    ...loc,
    score: Math.max(0, score),
    issues,
    addressFormatted,
  }
}
