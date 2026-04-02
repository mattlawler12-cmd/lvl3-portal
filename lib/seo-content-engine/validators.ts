/**
 * SEO Content Engine — Validators
 * Ported from Python validators.py
 */
import { KEYWORD_TARGETS, MIN_WORD_COUNT, DATA_COVERAGE_THRESHOLD } from './config'
import type { KeywordPlan, ContentBrief } from './types'

export interface ValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}

export function validateKeywordPlan(plan: KeywordPlan): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  for (const [cat, targets] of Object.entries(KEYWORD_TARGETS)) {
    const count = (plan[cat as keyof typeof plan] as string[] | undefined)?.length ?? 0
    if (count < targets.min) {
      warnings.push(`${cat} keywords: ${count} (below minimum of ${targets.min})`)
    }
    if (count > targets.max) {
      warnings.push(`${cat} keywords: ${count} (above maximum of ${targets.max})`)
    }
  }

  if (!plan.clusters?.length) {
    warnings.push('No semantic clusters defined')
  }

  return { valid: errors.length === 0, warnings, errors }
}

export function validateBrief(brief: ContentBrief | Record<string, unknown>): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  const requiredKeys = [
    'title', 'primary_keywords', 'outline', 'geo_targets',
    'citation_hooks', 'entity_definitions', 'editorial_guidance',
    'meta_title', 'meta_description',
  ]

  for (const key of requiredKeys) {
    const val = (brief as Record<string, unknown>)[key]
    if (val === undefined || val === null || val === '') {
      errors.push(`Brief missing required field: ${key}`)
    } else if (Array.isArray(val) && val.length === 0) {
      warnings.push(`Brief field '${key}' is empty array`)
    }
  }

  const outline = (brief as Record<string, unknown>).outline as unknown[]
  if (outline && outline.length < 3) {
    warnings.push(`Outline has only ${outline.length} sections (expected 5+)`)
  }

  return { valid: errors.length === 0, warnings, errors }
}

export function validateDraft(draftText: string, brief: ContentBrief | Record<string, unknown>): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  const wordCount = draftText.split(/\s+/).filter(Boolean).length

  if (wordCount < MIN_WORD_COUNT) {
    errors.push(`Word count ${wordCount} below minimum of ${MIN_WORD_COUNT}`)
  }

  // Check primary keywords present
  const primaryKeywords = ((brief as Record<string, unknown>).primary_keywords ?? []) as string[]
  const draftLower = draftText.toLowerCase()
  const missing = primaryKeywords.filter((kw) => !draftLower.includes(kw.toLowerCase()))
  if (missing.length) {
    warnings.push(`Missing primary keywords in draft: ${missing.join(', ')}`)
  }

  return { valid: errors.length === 0, warnings, errors }
}

export function validateDataCoverage(plan: KeywordPlan): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  const primaryWithMetrics = plan.primary.filter(
    (kw) => plan.metrics[kw] && plan.metrics[kw].msv > 0,
  ).length

  const coverage = plan.primary.length > 0
    ? primaryWithMetrics / plan.primary.length
    : 0

  if (coverage < DATA_COVERAGE_THRESHOLD) {
    warnings.push(
      `Only ${(coverage * 100).toFixed(0)}% of primary keywords have search volume data (threshold: ${(DATA_COVERAGE_THRESHOLD * 100).toFixed(0)}%)`,
    )
  }

  return { valid: true, warnings, errors }
}
