// lib/tfk/generator.ts — Claude content generation
import Anthropic from '@anthropic-ai/sdk'
import type { TfkLocation } from './types'

export const COPY_KEYS = [
  'page_title', 'hero_subhead', 'overview_h2', 'overview_p1', 'overview_p2',
  'neighborhood_h2', 'neighborhood_p', 'neighborhood_tags',
  'faq_reservations', 'faq_hours', 'faq_parking', 'faq_order_url_note',
  'meta_description', 'og_title', 'og_description',
] as const

export type CopyKey = (typeof COPY_KEYS)[number]

const PLACEHOLDER_CONTENT = Object.fromEntries(COPY_KEYS.map(k => [k, '[CONTENT NEEDED]'])) as Record<string, string>

function buildPrompt(loc: TfkLocation): string {
  const pdrLabel = loc.has_pdr && loc.pdr_capacity_label ? loc.pdr_capacity_label : 'None'

  const googleContext: string[] = []
  if (loc.hours_google_raw) {
    googleContext.push(`- Google-verified hours: ${loc.hours_google_raw}`)
    if (loc.hours_match === '⚠ Mismatch') {
      googleContext.push(`  ⚠ NOTE: Google hours differ from the spreadsheet hours above — use the Google hours as the source of truth for faq_hours.`)
    }
  }
  if (loc.google_rating) {
    googleContext.push(`- Google rating: ${loc.google_rating} (${loc.google_review_count?.toLocaleString()} reviews)`)
  }
  if (loc.google_reviews_snippet) {
    googleContext.push(`- Recent guest reviews (for tone/context only — do not quote directly): ${loc.google_reviews_snippet}`)
  }

  const googleSection = googleContext.length
    ? `\nGOOGLE DATA (use to ground and verify your content):\n${googleContext.join('\n')}`
    : ''

  return `You are writing location page content for True Food Kitchen, a health-forward seasonal restaurant co-founded with Dr. Andrew Weil. Write in a warm, confident, factual tone — not promotional fluff. Avoid superlatives. Be specific and locally grounded.

Write content for the following True Food Kitchen location. Return ONLY a valid JSON object with exactly these keys — no preamble, no markdown fences, no other text:

{
  "page_title": "Title tag — HARD LIMIT: 60-65 characters, count every character before submitting. Format: True Food Kitchen [City] | [Center Name] Restaurant. If the center name is long, abbreviate it slightly to stay within range.",
  "meta_description": "Meta description — HARD LIMIT: 150-160 characters, count every character before submitting. Exceeding 160 chars will cause SEO issues. Lead with the city and location, mention health-forward seasonal dining, and one use case. Stop at 160.",
  "og_title": "Open Graph title — 55-70 characters. Warmer/more conversational than page_title. Count characters.",
  "og_description": "Open Graph description — 150-200 characters. Punchy, locally specific, suitable for a social preview card.",
  "hero_subhead": "Short subhead line. Format: [Center Name] • [Street Address]",
  "overview_h2": "H2 for the About section, 4-7 words, location-specific. Example: 'Healthy Dining at Biltmore Fashion Park'",
  "overview_p1": "2-3 sentences. Reference the center name, the neighborhood or area it draws from, and 1-2 specific use cases (lunch, brunch, group dinners). Be specific to this city and center.",
  "overview_p2": "2-3 sentences. Mention the outdoor or patio situation if exterior seating > 0, a specific dining occasion, and the full TFK experience. Keep it factual and locally grounded.",
  "neighborhood_h2": "H2 for the Neighborhood section. Format: '[Center Name] & [Neighborhood or Area Name]'",
  "neighborhood_p": "2-3 sentences. Name the shopping center, describe where it sits in the city (cross streets or landmarks), mention nearby neighborhoods or office districts, and state the parking situation.",
  "neighborhood_tags": ["CRITICAL RULES — read carefully before writing: (1) Every tag must be a complete, standalone proper name as it is publicly known — NEVER truncate a named place to a single generic word. WRONG: 'Quarter', 'Village', 'Park', 'Commons', 'Crossing', 'Town Center', 'The Crossing', 'Memorial', 'Paradise'. RIGHT: 'Scottsdale Quarter', 'Kierland Commons', 'Desert Ridge Marketplace', 'The Woodlands Town Center', 'Memorial Park', 'Paradise, NV'. (2) Include 6-10 real, verifiable neighborhoods, districts, suburbs, or named commercial areas within 10-15 miles. (3) Do not invent place names."],
  "faq_reservations": "1-2 sentence answer. Reference the phone number and that walk-ins are welcome. Mention OpenTable.",
  "faq_hours": "1-2 sentence answer. State the full week hours clearly. If Google-verified hours are provided and differ from the spreadsheet, use the Google hours.",
  "faq_parking": "1 sentence referencing the specific parking situation at this center.",
  "faq_order_url_note": "1 sentence directing users to order online for pickup or delivery, referencing the city name."
}

LOCATION DATA:
- Store name: ${loc.store_name}
- Center: ${loc.center_name}
- City: ${loc.city}, ${loc.state}
- Address: ${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}
- Phone: ${loc.phone_display}
- Hours (spreadsheet): ${loc.hours_raw}
- Parking: ${loc.parking}
- Location type: ${loc.location_type}
- Interior seating: ${loc.interior_seats} seats
- Exterior/patio seating: ${loc.exterior_seats} seats
- Private dining room: ${pdrLabel}
- Open since: ${loc.open_date}
- Region: ${loc.region}${googleSection}`
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseJsonResponse(text: string): Record<string, string> {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
  return JSON.parse(cleaned)
}

export async function generateContent(location: TfkLocation): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { ...PLACEHOLDER_CONTENT }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildPrompt(location) }],
    })

    const block = response.content?.[0]
    const text = block?.type === 'text' ? block.text : null
    if (!text) throw new Error('Empty response from Claude')

    const parsed = parseJsonResponse(text)

    if (Array.isArray(parsed.neighborhood_tags)) {
      parsed.neighborhood_tags = (parsed.neighborhood_tags as string[]).join('|')
    }

    return parsed
  } catch {
    return { ...PLACEHOLDER_CONTENT }
  }
}
