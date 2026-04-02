/**
 * SEO Content Engine — Utilities
 * Ported from Python utils.py
 */

/**
 * Convert a title to a filesystem/URL-safe slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

/**
 * Merge multiple keyword arrays, deduplicate case-insensitively.
 * Handles both string and object entries (extracts keyword string from objects).
 */
export function mergeDedup(...lists: (string | Record<string, unknown>)[][]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const list of lists) {
    for (let item of list) {
      // Handle dict entries from LLM responses
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        const kw = (obj.keyword ?? obj.term ?? obj.name ?? '') as string
        if (!kw) continue
        item = kw
      }
      if (typeof item !== 'string') continue

      const cleaned = item.trim()
      if (!cleaned) continue

      const key = cleaned.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        result.push(cleaned)
      }
    }
  }
  return result
}

/**
 * Extract JSON from an LLM response that may contain markdown fences or prose.
 * Tries multiple strategies in order.
 */
export function parseJsonResponse(text: string): Record<string, unknown> | unknown[] | null {
  if (!text || !text.trim()) return null

  // Strategy 1: Extract from ```json ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      // fall through
    }
  }

  // Strategy 2: Find outermost { } or [ ]
  const braceStart = text.indexOf('{')
  const bracketStart = text.indexOf('[')

  let start = -1
  let end = -1
  let openChar = '{'
  let closeChar = '}'

  if (braceStart >= 0 && (bracketStart < 0 || braceStart < bracketStart)) {
    start = braceStart
    openChar = '{'
    closeChar = '}'
  } else if (bracketStart >= 0) {
    start = bracketStart
    openChar = '['
    closeChar = ']'
  }

  if (start >= 0) {
    // Find matching close by counting nesting
    let depth = 0
    for (let i = start; i < text.length; i++) {
      if (text[i] === openChar) depth++
      else if (text[i] === closeChar) depth--
      if (depth === 0) {
        end = i
        break
      }
    }

    if (end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {
        // fall through
      }
    }
  }

  // Strategy 3: Try parsing the whole string
  try {
    return JSON.parse(text.trim())
  } catch {
    return null
  }
}

/**
 * Fuzzy topic matching using Jaccard-like token overlap.
 * Returns true if overlap >= threshold.
 */
export function fuzzyTopicMatch(
  a: string,
  b: string,
  threshold = 0.4,
): boolean {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean),
    )

  const tokensA = tokenize(a)
  const tokensB = tokenize(b)

  if (tokensA.size === 0 || tokensB.size === 0) return false

  let overlap = 0
  Array.from(tokensA).forEach((t) => {
    if (tokensB.has(t)) overlap++
  })

  const score = overlap / Math.min(tokensA.size, tokensB.size)
  return score >= threshold
}

/**
 * Safe JSON stringify for template interpolation.
 */
export function toJsonStr(value: unknown, indent = 2): string {
  try {
    return JSON.stringify(value, null, indent)
  } catch {
    return String(value)
  }
}
