/**
 * SEO Content Engine — Configuration
 * Ported from Python config.py
 */

// ── Model Routing ──────────────────────────────────────────────
export const MODELS: Record<string, string> = {
  keyword_gen: 'claude-sonnet-4-6',
  keyword_scoring: 'claude-sonnet-4-6',
  keyword_replacement: 'claude-sonnet-4-6',
  keyword_clustering: 'claude-sonnet-4-6',
  pre_brief_analysis: 'claude-sonnet-4-6',
  brief: 'claude-sonnet-4-6',
  draft: 'claude-sonnet-4-6',
  draft_review: 'claude-sonnet-4-6',
  draft_revision: 'claude-sonnet-4-6',
}

// ── Temperature Map ────────────────────────────────────────────
export const TEMPERATURES: Record<string, number> = {
  keyword_gen: 0.5,
  keyword_scoring: 0.2,
  keyword_replacement: 0.5,
  keyword_clustering: 0.3,
  pre_brief_analysis: 0.4,
  brief: 0.5,
  draft: 0.6,
  draft_review: 0.2,
  draft_revision: 0.5,
}

// ── Max Tokens per Stage ───────────────────────────────────────
export const MAX_TOKENS: Record<string, number> = {
  keyword_gen: 4096,
  keyword_scoring: 8192,
  keyword_replacement: 2048,
  keyword_clustering: 4096,
  pre_brief_analysis: 4096,
  brief: 16_384,
  draft: 16384,
  draft_review: 2048,
  draft_revision: 8192,
}

// ── Per-Stage Timeout (ms) ────────────────────────────────────
// Long-output stages (brief, draft) need more time, especially under concurrency
export const STAGE_TIMEOUTS: Record<string, number> = {
  keyword_gen: 120_000,
  keyword_scoring: 120_000,
  keyword_replacement: 90_000,
  keyword_clustering: 90_000,
  pre_brief_analysis: 180_000,
  brief: 360_000,
  draft: 300_000,
  draft_review: 120_000,
  draft_revision: 300_000,
}

// ── Keyword Count Targets ──────────────────────────────────────
export const KEYWORD_TARGETS: Record<string, { min: number; max: number }> = {
  primary: { min: 8, max: 12 },
  secondary: { min: 12, max: 18 },
  supporting: { min: 8, max: 15 },
  questions: { min: 10, max: 15 },
}

// ── Data Source Toggles ────────────────────────────────────────
export const DATA_SOURCE_TOGGLES: Record<string, boolean> = {
  keywords_everywhere: true,
  semrush: true,
  gsc: true,
  crawler: true,
}

// ── Draft Review Settings ──────────────────────────────────────
export const DRAFT_REVIEW_ENABLED = true
export const MAX_REVISION_ATTEMPTS = 1
export const MIN_WORD_COUNT = 1800

// ── Data Coverage Threshold ────────────────────────────────────
export const DATA_COVERAGE_THRESHOLD = 0.8 // warn if < 80% primary keywords have metrics

// ── Parallel Execution ─────────────────────────────────────────
export const PARALLEL_TOPIC_LIMIT = 10

// ── Run Modes ──────────────────────────────────────────────────
export const MODES: Record<string, string> = {
  keywords_only: 'Keywords Only',
  brief: 'Keywords + Brief',
  full: 'Full Pipeline',
}
