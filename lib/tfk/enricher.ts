// lib/tfk/enricher.ts — Google Places enrichment (native fetch, no axios)
import type { TfkLocation } from './types'

const FIND_PLACE_URL   = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
const PLACE_DETAIL_URL = 'https://maps.googleapis.com/maps/api/place/details/json'

// ── Time helpers ──────────────────────────────────────────────────────────────

function parseTime(str: string): string | null {
  if (!str) return null
  const s = str.trim().toLowerCase()
  const m = s.match(/^(\d+)(?::(\d+))?(am|pm)$/)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] ?? '00'
  if (m[3] === 'pm' && h !== 12) h += 12
  if (m[3] === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min}`
}

function parseHoursLine(line: string): { days: string; open: string | null; close: string | null } | null {
  const normalized = line.replace(/\u2013|\u2014/g, '-').trim()
  const colonIdx = normalized.indexOf(':')
  if (colonIdx === -1) return null
  const dayPart  = normalized.slice(0, colonIdx).trim()
  const timePart = normalized.slice(colonIdx + 1).trim()
  const timeSplit = timePart.split(/\s*-\s*/)
  if (timeSplit.length < 2) return null
  return {
    days:  dayPart,
    open:  parseTime(timeSplit[0].trim()),
    close: parseTime(timeSplit[1].trim()),
  }
}

function dayToSchema(dayStr: string): string | null {
  const d = dayStr.toLowerCase().trim()
  if (/^mon/.test(d) && /th|thu/.test(d)) return 'Mo-Th'
  if (/^mon/.test(d)) return 'Mo'
  if (/^tue/.test(d)) return 'Tu'
  if (/^wed/.test(d)) return 'We'
  if (/^thu/.test(d) || /^th/.test(d)) return 'Th'
  if (/^fri/.test(d)) return 'Fr'
  if (/^sat/.test(d)) return 'Sa'
  if (/^sun/.test(d)) return 'Su'
  return null
}

export function buildOpeningHoursSchema(raw: string | null | undefined): string[] {
  if (!raw) return []
  const lines = String(raw).split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const result: string[] = []
  for (const line of lines) {
    const parsed = parseHoursLine(line)
    if (!parsed || !parsed.open || !parsed.close) continue
    const schemaDay = dayToSchema(parsed.days)
    if (schemaDay) result.push(`${schemaDay} ${parsed.open}-${parsed.close}`)
  }
  return result
}

function parseGoogleHours(weekdayText: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of weekdayText) {
    const idx = line.indexOf(': ')
    if (idx === -1) continue
    const day   = line.slice(0, idx).toLowerCase()
    const hours = line.slice(idx + 2).trim()
    map[day] = hours
  }
  return map
}

function normalizeHoursStr(s: string): string {
  if (!s) return ''
  return s.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/closed/g, 'closed')
}

function compareHours(location: TfkLocation, googleHoursMap: Record<string, string>): string {
  if (!googleHoursMap || Object.keys(googleHoursMap).length === 0) return '—'
  const sheetMonThu = location.hours_mon_thu
  const googleMon   = googleHoursMap['monday'] || ''
  if (!sheetMonThu || !googleMon) return '—'
  const googleTime = googleMon.replace(/^open\s*/i, '').trim()
  const a = normalizeHoursStr(sheetMonThu)
  const b = normalizeHoursStr(googleTime)
  return a === b ? '✓ Match' : '⚠ Mismatch'
}

// ── Enrich one location ───────────────────────────────────────────────────────

export async function enrichOne(loc: TfkLocation, apiKey: string): Promise<{ warning: boolean }> {
  // Step 1: Find Place
  try {
    const url = new URL(FIND_PLACE_URL)
    url.searchParams.set('input', `True Food Kitchen ${loc.city} ${loc.state}`)
    url.searchParams.set('inputtype', 'textquery')
    url.searchParams.set('fields', 'place_id,geometry,rating,user_ratings_total')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    const data = await res.json() as { candidates?: Array<{ place_id?: string; geometry?: { location?: { lat: number; lng: number } }; rating?: number; user_ratings_total?: number }> }
    const candidates = data?.candidates
    if (!candidates || candidates.length === 0) return { warning: true }

    const place = candidates[0]
    loc.google_place_id      = place.place_id ?? null
    loc.latitude             = place.geometry?.location?.lat ?? null
    loc.longitude            = place.geometry?.location?.lng ?? null
    loc.google_rating        = place.rating ?? null
    loc.google_review_count  = place.user_ratings_total ?? null
    loc.google_maps_url      = place.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
      : null
    loc.url_directions = loc.google_maps_url
  } catch {
    return { warning: true }
  }

  if (!loc.google_place_id) return { warning: true }

  await new Promise(r => setTimeout(r, 100))

  // Step 2: Place Details
  try {
    const url2 = new URL(PLACE_DETAIL_URL)
    url2.searchParams.set('place_id', loc.google_place_id)
    url2.searchParams.set('fields', 'opening_hours,reviews,url,rating,user_ratings_total')
    url2.searchParams.set('key', apiKey)

    const res2 = await fetch(url2.toString(), { signal: AbortSignal.timeout(10000) })
    const data2 = await res2.json() as { result?: { url?: string; opening_hours?: { weekday_text?: string[] }; reviews?: Array<{ text: string; rating: number }>; rating?: number; user_ratings_total?: number } }
    const detail = data2?.result
    if (!detail) return { warning: false }

    if (detail.url) { loc.google_maps_url = detail.url; loc.url_directions = detail.url }

    const weekdayText: string[] = detail.opening_hours?.weekday_text ?? []
    const googleHoursMap = parseGoogleHours(weekdayText)

    loc.hours_google_raw     = weekdayText.join(' | ') || null
    loc.hours_google_mon_thu = googleHoursMap['monday']   ?? null
    loc.hours_google_fri     = googleHoursMap['friday']   ?? null
    loc.hours_google_sat     = googleHoursMap['saturday'] ?? null
    loc.hours_google_sun     = googleHoursMap['sunday']   ?? null
    loc.hours_match          = compareHours(loc, googleHoursMap)

    const reviews = detail.reviews ?? []
    loc.google_reviews_snippet = reviews
      .slice(0, 3)
      .map(r => `"${r.text}" — ${r.rating}★`)
      .join(' | ') || null

    if (detail.rating)             loc.google_rating       = detail.rating
    if (detail.user_ratings_total) loc.google_review_count = detail.user_ratings_total
    loc.opening_hours_schema = buildOpeningHoursSchema(loc.hours_raw)
  } catch {
    // non-fatal — basic enrichment done
  }

  return { warning: false }
}
