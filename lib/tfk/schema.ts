// lib/tfk/schema.ts — LocalBusiness JSON-LD schema builder
import { buildOpeningHoursSchema } from './enricher'
import type { TfkLocation } from './types'

function stripUndefined(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripUndefined)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, stripUndefined(v)])
    )
  }
  return obj
}

export function buildSchema(loc: TfkLocation): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'LocalBusiness'],
    name: `True Food Kitchen ${loc.city}`,
    description: loc.meta_description ?? undefined,
    url: `https://www.truefoodkitchen.com/locations/${loc.page_slug}/`,
    telephone: loc.phone_e164 || undefined,
    email: loc.email ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: loc.address ?? undefined,
      addressLocality: loc.city ?? undefined,
      addressRegion: loc.state ?? undefined,
      postalCode: loc.zip ? String(loc.zip) : undefined,
      addressCountry: 'US',
    },
    servesCuisine: ['American', 'Health Food', 'Vegetarian', 'Vegan', 'Gluten-Free Options'],
    priceRange: '$$',
  }

  // Opening hours
  const schemaHours = loc.opening_hours_schema?.length
    ? loc.opening_hours_schema
    : buildOpeningHoursSchema(loc.hours_raw)

  if (schemaHours && schemaHours.length > 0) {
    schema.openingHours = schemaHours
  }

  // Geo coordinates
  if (loc.latitude && loc.longitude) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: loc.latitude,
      longitude: loc.longitude,
    }
  }

  // Aggregate rating
  if (loc.google_rating && loc.google_review_count) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: loc.google_rating,
      reviewCount: loc.google_review_count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  if (loc.google_maps_url) {
    schema.hasMap = loc.google_maps_url
  }

  // Amenity features
  if (loc.total_seats) {
    const amenities: unknown[] = [
      { '@type': 'LocationFeatureSpecification', name: 'Seating capacity', value: loc.total_seats },
    ]
    if (loc.exterior_seats && Number(loc.exterior_seats) > 0) {
      amenities.push({ '@type': 'LocationFeatureSpecification', name: 'Patio/outdoor seating', value: true })
    }
    if (loc.has_pdr) {
      amenities.push({ '@type': 'LocationFeatureSpecification', name: 'Private dining room', value: true })
    }
    schema.amenityFeature = amenities
  }

  return JSON.stringify(stripUndefined(schema))
}
