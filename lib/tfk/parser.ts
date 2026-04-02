// lib/tfk/parser.ts — parse Store DNA xlsx buffer into TfkLocation[]
import * as XLSX from 'xlsx'
import type { TfkLocation, ParseResult } from './types'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function excelSerialToDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569)
  return new Date(utcDays * 86400 * 1000)
}

function formatOpenDate(val: unknown): string | null {
  if (!val) return null
  let d: Date
  if (typeof val === 'number') {
    d = excelSerialToDate(val)
  } else if (val instanceof Date) {
    d = val
  } else if (typeof val === 'string') {
    d = new Date(val)
  } else {
    return String(val)
  }
  if (isNaN(d.getTime())) return String(val)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function isClosed(row: unknown[]): boolean {
  const closeDate = row[22]
  if (closeDate === null || closeDate === undefined || closeDate === '' || closeDate === 0) return false
  return true
}

function toSlug(name: unknown): string {
  if (!name) return ''
  return String(name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function toE164(phone: unknown): string {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  return `+1${digits}`
}

function parseHours(raw: unknown) {
  if (!raw) return { hours_mon_thu: null, hours_fri: null, hours_sat: null, hours_sun: null }

  const lines = String(raw).split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const result = { hours_mon_thu: null as string | null, hours_fri: null as string | null, hours_sat: null as string | null, hours_sun: null as string | null }

  for (const line of lines) {
    const normalized = line.replace(/\u2013|\u2014/g, '-').replace(/\s*-\s*/g, ' - ')
    if (/^mon/i.test(normalized)) {
      const parts = line.split(/:\s*/)
      result.hours_mon_thu = parts.slice(1).join(': ').trim() || line
    } else if (/^fri/i.test(normalized)) {
      const parts = line.split(/:\s*/)
      result.hours_fri = parts.slice(1).join(': ').trim() || line
    } else if (/^sat/i.test(normalized)) {
      const parts = line.split(/:\s*/)
      result.hours_sat = parts.slice(1).join(': ').trim() || line
    } else if (/^sun/i.test(normalized)) {
      const parts = line.split(/:\s*/)
      result.hours_sun = parts.slice(1).join(': ').trim() || line
    }
  }

  return result
}

function parseRow(row: unknown[]): TfkLocation {
  const storeNumber = row[3]
  const storeName   = row[2]
  const centerName  = row[0]
  const openDateRaw = row[1]
  const city        = row[5]
  const state       = row[6]
  const county      = row[7]
  const address     = row[8]
  const zip         = row[9]
  const phone       = row[10]
  const email       = row[11]
  const region      = row[12]
  const regionalMgr = row[13]
  const hoursRaw    = row[14]
  const parking     = row[15]
  const seatInt     = row[16]
  const seatExt     = row[17]
  const seatTotal   = row[18]
  const locType     = row[21]
  const levels      = row[23]
  const pdrCapacity = row[24]
  const pdrTotal    = row[28]

  const pdrCapStr = pdrCapacity != null ? String(pdrCapacity).trim().toLowerCase() : ''
  const hasPdr = !!(pdrCapStr && pdrCapStr !== '' && pdrCapStr !== 'no' && pdrCapStr !== 'false' && pdrCapStr !== '0')

  const parsedHours = parseHours(hoursRaw)

  return {
    store_number:      storeNumber != null ? String(storeNumber) : null,
    store_name:        storeName   != null ? String(storeName)   : null,
    center_name:       centerName  != null ? String(centerName)  : null,
    page_slug:         toSlug(storeName),
    open_date:         formatOpenDate(openDateRaw),

    city:              city    != null ? String(city)    : null,
    state:             state   != null ? String(state)   : null,
    county:            county  != null ? String(county)  : null,
    address:           address != null ? String(address) : null,
    zip:               zip     != null ? String(zip)     : null,
    phone_display:     phone   != null ? String(phone)   : null,
    phone_e164:        toE164(phone),
    email:             email   != null ? String(email)   : null,
    region:            region  != null ? String(region)  : null,
    regional_manager:  regionalMgr != null ? String(regionalMgr) : null,

    hours_raw:         hoursRaw != null ? String(hoursRaw) : null,
    hours_mon_thu:     parsedHours.hours_mon_thu,
    hours_fri:         parsedHours.hours_fri,
    hours_sat:         parsedHours.hours_sat,
    hours_sun:         parsedHours.hours_sun,

    hours_google_raw:     null,
    hours_google_mon_thu: null,
    hours_google_fri:     null,
    hours_google_sat:     null,
    hours_google_sun:     null,
    hours_match:          null,

    location_type:     locType  != null ? String(locType)  : null,
    parking:           parking  != null ? String(parking)  : null,
    interior_seats:    seatInt  != null ? Number(seatInt)  : null,
    exterior_seats:    seatExt  != null ? Number(seatExt)  : null,
    total_seats:       seatTotal != null ? Number(seatTotal) : null,
    levels:            levels   != null ? Number(levels)   : null,
    has_pdr:           hasPdr ? 1 : 0,
    pdr_capacity_label: pdrCapacity != null ? String(pdrCapacity) : null,
    pdr_total:         pdrTotal != null ? Number(pdrTotal) : null,

    google_place_id:   null,
    latitude:          null,
    longitude:         null,
    google_rating:     null,
    google_review_count: null,
    google_maps_url:   null,
    google_reviews_snippet: null,
    opening_hours_schema: null,

    url_reserve:       '[ADD OPENTABLE LINK]',
    url_order:         '[ADD ORDER LINK]',
    url_directions:    null,

    page_title:        null,
    meta_description:  null,
    og_title:          null,
    og_description:    null,
    hero_subhead:      null,
    overview_h2:       null,
    overview_p1:       null,
    overview_p2:       null,
    neighborhood_h2:   null,
    neighborhood_p:    null,
    neighborhood_tags: null,
    faq_reservations:  null,
    faq_hours:         null,
    faq_parking:       null,
    faq_order_url_note: null,

    schema_json:       null,
    validation_notes:  null,
  }
}

export function parse(buffer: Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames.includes('Sheet1') ? 'Sheet1' : wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })
  const dataRows = rows.slice(1)

  const locations: TfkLocation[] = []
  let skippedCount = 0

  for (const row of dataRows) {
    const r = row as unknown[]
    if (!r || r.every(cell => cell === null || cell === undefined || cell === '')) continue
    if (isClosed(r)) {
      skippedCount++
      continue
    }
    locations.push(parseRow(r))
  }

  return { locations, skippedCount }
}
