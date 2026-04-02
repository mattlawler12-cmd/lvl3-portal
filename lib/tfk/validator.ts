// lib/tfk/validator.ts — post-generation validation
import type { TfkLocation, ValidationResult } from './types'

const BARE_GENERIC_WORDS = new Set([
  'quarter','village','park','commons','crossing','center','town center',
  'memorial','paradise','district','heights','hills','beach','gardens',
  'landing','row','walk','place','plaza','square','corridor','mall',
  'marketplace','market','point','ridge','grove','lake','vista',
  'springs','creek','valley','hollow','meadows','estates','reserve',
  'preserve','pointe','cove','bay','harbour','harbor','bluffs',
  'terrace','downs','knolls','pines','oaks','woods','glen','mews',
])

function checkNeighborhoodTags(tags: string | null): string[] {
  const warnings: string[] = []
  if (!tags || tags === '[CONTENT NEEDED]') return warnings
  const list = tags.split('|').map(t => t.trim())
  for (const tag of list) {
    if (!tag) continue
    const lower = tag.toLowerCase()
    if (BARE_GENERIC_WORDS.has(lower)) {
      warnings.push(`neighborhood_tags: "${tag}" is a truncated or generic term — needs a proper place name`)
    }
    if (/^the\s+(crossing|landing|commons|village|quarter|park|grove|reserve|ridge|cove|bay|pines|oaks|woods|glen|meadows|downs|knolls|terrace|bluffs|pointe|plaza|square|mall|market|marketplace|center|district)$/i.test(tag)) {
      warnings.push(`neighborhood_tags: "${tag}" may be a truncated proper name — verify it's the complete name`)
    }
  }
  return warnings
}

function checkPageTitle(title: string | null): string[] {
  const warnings: string[] = []
  if (!title || title === '[CONTENT NEEDED]') return warnings
  if (title.length < 50) warnings.push(`page_title: only ${title.length} chars — should be 60-65 (too short, likely missing info)`)
  if (title.length > 65) warnings.push(`page_title: ${title.length} chars — exceeds 65 char limit`)
  return warnings
}

function checkMetaDescription(desc: string | null): string[] {
  const warnings: string[] = []
  if (!desc || desc === '[CONTENT NEEDED]') return warnings
  if (desc.length < 130) warnings.push(`meta_description: only ${desc.length} chars — should be 150-160`)
  if (desc.length > 165) warnings.push(`meta_description: ${desc.length} chars — exceeds 160 char limit`)
  return warnings
}

function checkHeroSubhead(subhead: string | null): string[] {
  const warnings: string[] = []
  if (!subhead || subhead === '[CONTENT NEEDED]') return warnings
  if (!subhead.includes('•')) warnings.push(`hero_subhead: missing • separator — should be "[Center Name] • [Address]"`)
  return warnings
}

function checkPlaceholders(content: Record<string, string>): string[] {
  const warnings: string[] = []
  for (const [key, val] of Object.entries(content)) {
    if (val === '[CONTENT NEEDED]') {
      warnings.push(`${key}: still [CONTENT NEEDED] — Claude generation failed for this field`)
    }
  }
  return warnings
}

export function validate(location: TfkLocation, content: Record<string, string>): ValidationResult {
  const warnings = [
    ...checkPlaceholders(content),
    ...checkPageTitle(content.page_title),
    ...checkMetaDescription(content.meta_description),
    ...checkHeroSubhead(content.hero_subhead),
    ...checkNeighborhoodTags(content.neighborhood_tags),
  ]

  return {
    valid:    warnings.length === 0,
    warnings,
    summary:  warnings.length === 0 ? '✓' : `⚠ ${warnings.length} issue(s)`,
  }
}
