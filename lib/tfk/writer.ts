// lib/tfk/writer.ts — build output xlsx as Buffer (in-memory, no disk write)
import * as XLSX from 'xlsx'
import type { TfkLocation } from './types'

const COLUMNS: Array<{ key: keyof TfkLocation | string; header: string; width: number }> = [
  { key: 'store_number',       header: 'store_number',          width: 14 },
  { key: 'store_name',         header: 'store_name',            width: 20 },
  { key: 'center_name',        header: 'center_name',           width: 30 },
  { key: 'page_slug',          header: 'page_slug',             width: 24 },
  { key: 'open_date',          header: 'open_date',             width: 16 },
  { key: 'city',               header: 'city',                  width: 20 },
  { key: 'state',              header: 'state',                 width: 8  },
  { key: 'county',             header: 'county',                width: 20 },
  { key: 'address',            header: 'address',               width: 32 },
  { key: 'zip',                header: 'zip',                   width: 10 },
  { key: 'phone_display',      header: 'phone_display',         width: 16 },
  { key: 'phone_e164',         header: 'phone_e164',            width: 18 },
  { key: 'email',              header: 'email',                 width: 36 },
  { key: 'region',             header: 'region',                width: 20 },
  { key: 'regional_manager',   header: 'regional_manager',      width: 24 },
  { key: 'hours_raw',          header: 'hours_raw',             width: 48 },
  { key: 'hours_mon_thu',      header: 'hours_mon_thu',         width: 22 },
  { key: 'hours_fri',          header: 'hours_fri',             width: 22 },
  { key: 'hours_sat',          header: 'hours_sat',             width: 22 },
  { key: 'hours_sun',          header: 'hours_sun',             width: 22 },
  { key: 'hours_google_mon_thu', header: 'hours_google_mon_thu', width: 28 },
  { key: 'hours_google_fri',   header: 'hours_google_fri',      width: 28 },
  { key: 'hours_google_sat',   header: 'hours_google_sat',      width: 28 },
  { key: 'hours_google_sun',   header: 'hours_google_sun',      width: 28 },
  { key: 'hours_match',        header: 'hours_match',           width: 14 },
  { key: 'location_type',      header: 'location_type',         width: 22 },
  { key: 'parking',            header: 'parking',               width: 22 },
  { key: 'interior_seats',     header: 'interior_seats',        width: 14 },
  { key: 'exterior_seats',     header: 'exterior_seats',        width: 14 },
  { key: 'total_seats',        header: 'total_seats',           width: 14 },
  { key: 'levels',             header: 'levels',                width: 8  },
  { key: 'has_pdr',            header: 'has_pdr',               width: 8  },
  { key: 'pdr_capacity_label', header: 'pdr_capacity_label',    width: 20 },
  { key: 'pdr_total',          header: 'pdr_total',             width: 10 },
  { key: 'google_place_id',    header: 'google_place_id',       width: 36 },
  { key: 'latitude',           header: 'latitude',              width: 14 },
  { key: 'longitude',          header: 'longitude',             width: 14 },
  { key: 'google_rating',      header: 'google_rating',         width: 12 },
  { key: 'google_review_count', header: 'google_review_count',  width: 18 },
  { key: 'google_maps_url',    header: 'google_maps_url',       width: 60 },
  { key: 'google_reviews_snippet', header: 'google_reviews_snippet', width: 80 },
  { key: 'url_reserve',        header: 'url_reserve',           width: 60 },
  { key: 'url_order',          header: 'url_order',             width: 60 },
  { key: 'url_directions',     header: 'url_directions',        width: 60 },
  { key: 'page_title',         header: 'page_title',            width: 70 },
  { key: 'meta_description',   header: 'meta_description',      width: 80 },
  { key: 'og_title',           header: 'og_title',              width: 70 },
  { key: 'og_description',     header: 'og_description',        width: 80 },
  { key: 'hero_subhead',       header: 'hero_subhead',          width: 60 },
  { key: 'overview_h2',        header: 'overview_h2',           width: 50 },
  { key: 'overview_p1',        header: 'overview_p1',           width: 90 },
  { key: 'overview_p2',        header: 'overview_p2',           width: 90 },
  { key: 'neighborhood_h2',    header: 'neighborhood_h2',       width: 50 },
  { key: 'neighborhood_p',     header: 'neighborhood_p',        width: 90 },
  { key: 'neighborhood_tags',  header: 'neighborhood_tags',     width: 70 },
  { key: 'faq_reservations',   header: 'faq_reservations',      width: 80 },
  { key: 'faq_hours',          header: 'faq_hours',             width: 70 },
  { key: 'faq_parking',        header: 'faq_parking',           width: 70 },
  { key: 'faq_order_url_note', header: 'faq_order_url_note',    width: 70 },
  { key: 'schema_json',        header: 'schema_json',           width: 90 },
  { key: 'validation_notes',   header: 'validation_notes',      width: 70 },
]

export function buildXlsxBuffer(rows: TfkLocation[]): Buffer {
  const headerRow = COLUMNS.map(c => c.header)
  const dataRows = rows.map(loc =>
    COLUMNS.map(col => {
      const val = (loc as unknown as Record<string, unknown>)[col.key]
      return (val !== null && val !== undefined) ? val : ''
    })
  )

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])

  ws['!cols'] = COLUMNS.map(c => ({ wch: c.width }))

  // Bold white on bottle-green header row
  for (let ci = 0; ci < COLUMNS.length; ci++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: ci })
    if (!ws[addr]) continue
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '093621' } },
    }
  }

  // Conditional: hours_match column
  const hoursMatchColIdx = COLUMNS.findIndex(c => c.key === 'hours_match')
  if (hoursMatchColIdx >= 0) {
    for (let ri = 1; ri <= rows.length; ri++) {
      const addr = XLSX.utils.encode_cell({ r: ri, c: hoursMatchColIdx })
      if (!ws[addr]) continue
      const val = ws[addr].v
      if (val === '⚠ Mismatch') {
        ws[addr].s = { font: { color: { rgb: 'B45309' } }, fill: { fgColor: { rgb: 'FEF3C7' } } }
      } else if (val === '✓ Match') {
        ws[addr].s = { font: { color: { rgb: '065F46' } }, fill: { fgColor: { rgb: 'D1FAE5' } } }
      }
    }
  }

  // Conditional: validation_notes column
  const validationColIdx = COLUMNS.findIndex(c => c.key === 'validation_notes')
  if (validationColIdx >= 0) {
    for (let ri = 1; ri <= rows.length; ri++) {
      const addr = XLSX.utils.encode_cell({ r: ri, c: validationColIdx })
      if (!ws[addr] || !ws[addr].v) continue
      const val = String(ws[addr].v)
      if (val && val !== '✓') {
        ws[addr].s = { font: { color: { rgb: '991B1B' } }, fill: { fgColor: { rgb: 'FEE2E2' } } }
      } else if (val === '✓') {
        ws[addr].s = { font: { color: { rgb: '065F46' } }, fill: { fgColor: { rgb: 'D1FAE5' } } }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Locations')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
