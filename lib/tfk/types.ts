// lib/tfk/types.ts — shared types for TFK Page Generator

export interface TfkLocation {
  // Identity
  store_number: string | null
  store_name: string | null
  center_name: string | null
  page_slug: string
  open_date: string | null

  // Address
  city: string | null
  state: string | null
  county: string | null
  address: string | null
  zip: string | null
  phone_display: string | null
  phone_e164: string
  email: string | null
  region: string | null
  regional_manager: string | null

  // Hours (spreadsheet)
  hours_raw: string | null
  hours_mon_thu: string | null
  hours_fri: string | null
  hours_sat: string | null
  hours_sun: string | null

  // Hours (Google cross-validation)
  hours_google_raw: string | null
  hours_google_mon_thu: string | null
  hours_google_fri: string | null
  hours_google_sat: string | null
  hours_google_sun: string | null
  hours_match: string | null

  // Venue
  location_type: string | null
  parking: string | null
  interior_seats: number | null
  exterior_seats: number | null
  total_seats: number | null
  levels: number | null
  has_pdr: 0 | 1
  pdr_capacity_label: string | null
  pdr_total: number | null

  // Google enrichment
  google_place_id: string | null
  latitude: number | null
  longitude: number | null
  google_rating: number | null
  google_review_count: number | null
  google_maps_url: string | null
  google_reviews_snippet: string | null

  // Opening hours schema
  opening_hours_schema: string[] | null

  // Links
  url_reserve: string
  url_order: string
  url_directions: string | null

  // Claude copy
  page_title: string | null
  meta_description: string | null
  og_title: string | null
  og_description: string | null
  hero_subhead: string | null
  overview_h2: string | null
  overview_p1: string | null
  overview_p2: string | null
  neighborhood_h2: string | null
  neighborhood_p: string | null
  neighborhood_tags: string | null
  faq_reservations: string | null
  faq_hours: string | null
  faq_parking: string | null
  faq_order_url_note: string | null

  // Output / validation
  schema_json: string | null
  validation_notes: string | null
}

export interface ParseResult {
  locations: TfkLocation[]
  skippedCount: number
}

export interface ValidationResult {
  valid: boolean
  warnings: string[]
  summary: string
}

// NDJSON events emitted by the streaming API route
export type TfkEvent =
  | { type: 'start'; total: number; skipped: number }
  | { type: 'progress'; store: string; city: string; state: string; step: 'enriching' | 'generating' | 'done'; index: number }
  | { type: 'location_done'; store: string; city: string; validation: string; hours_match: string | null }
  | { type: 'summary'; enrichWarnings: number; generationFailures: number; hoursWarnings: number; validationIssues: number }
  | { type: 'output'; xlsxBase64: string }
  | { type: 'error'; message: string }
  | { type: 'heartbeat' }
