/**
 * SEO Content Engine — TypeScript types
 * Ported from Python models.py
 */

// ── Input Types ──────────────────────────────────────────────

export interface SeedKeyword {
  keyword: string
  keyword_type: 'primary' | 'secondary' | 'supporting' | 'questions'
  volume: number
  cpc: number
  competition: number
  metrics_source: string
}

export interface TopicInput {
  title: string
  target_audience?: string
  angle?: string
  existing_url?: string
  brand_context?: string
  // Spreadsheet metadata
  pillar?: string
  funnel_stage?: string
  primary_intent?: string
  summary?: string
  overlap_risk?: string
  differentiation_angle?: string
  internal_linking?: string
  geo_notes?: string
  // Pre-seeded keywords from spreadsheet
  seed_keywords: SeedKeyword[]
}

// ── Keyword Plan ─────────────────────────────────────────────

export interface KeywordMetrics {
  msv: number
  cpc: number
  competition: number
}

export interface KeywordCluster {
  cluster_name: string
  keywords: string[]
  target_section: string
}

export interface RejectedKeyword {
  keyword: string
  reason: string
  category?: string
}

export interface KeywordPlan {
  primary: string[]
  secondary: string[]
  supporting: string[]
  questions: string[]
  clusters: KeywordCluster[]
  rejected: RejectedKeyword[]
  rationale: string
  metrics: Record<string, KeywordMetrics>
}

// ── Brief ────────────────────────────────────────────────────

export interface BriefOutlineSection {
  heading: string
  key_points: string[]
  keywords_to_include: string[]
  estimated_word_count: number
}

export interface BriefFAQ {
  question: string
  answer: string
}

export interface BriefInternalLink {
  anchor: string
  destination: string
  reason: string
}

export interface EditorialGuidance {
  angle: string
  tone: string
  what_to_emphasize: string[]
  what_to_avoid: string[]
  differentiation_notes: string
}

export interface ContentBrief {
  title: string
  primary_keywords: string[]
  secondary_keywords: string[]
  supporting_keywords: string[]
  keyword_clusters: KeywordCluster[]
  questions: string[]
  intent: string
  sub_intents: string[]
  keyword_rationale: string
  serp_insights: string | null
  serp_features_present: string[]
  competitive_gaps: string[]
  outline: BriefOutlineSection[]
  key_points: string[]
  faq_set: BriefFAQ[]
  internal_links: BriefInternalLink[]
  visual_notes: string[]
  geo_targets: string[]
  citation_hooks: string[]
  entity_definitions: Record<string, string>
  editorial_guidance: EditorialGuidance
  schema_recommendations: string[]
  meta_title: string
  meta_description: string
}

// ── Draft Review ─────────────────────────────────────────────

export interface DraftReviewIssue {
  type: string
  detail: string
  severity: 'critical' | 'moderate' | 'minor'
}

export interface DraftReview {
  passed: boolean
  issues: DraftReviewIssue[]
  missing_keywords: string[]
  word_count: number
  geo_score: 'strong' | 'moderate' | 'weak'
  recommendation: 'publish' | 'revise' | 'rewrite'
}

// ── Data Availability ────────────────────────────────────────

export interface DataSourceStatus {
  status: 'success' | 'failed' | 'skipped' | 'pending'
  count?: number
  latency_ms?: number
  error?: string
  reason?: string
  stages_completed?: number
  total_tokens?: number
}

export interface DataAvailability {
  keywords_everywhere?: DataSourceStatus
  semrush?: DataSourceStatus
  gsc?: DataSourceStatus
  anthropic?: DataSourceStatus
  crawler?: DataSourceStatus
}

// ── Run / Result Types ───────────────────────────────────────

export type RunMode = 'keywords_only' | 'brief' | 'full'
export type RunStatus = 'pending' | 'running' | 'complete' | 'failed' | 'partial'

export interface TopicResult {
  topic: TopicInput
  status: RunStatus
  keyword_plan: KeywordPlan | null
  brief: ContentBrief | null
  draft: string | null
  draft_review: DraftReview | null
  revised_draft: string | null
  error: string | null
  warnings: string[]
  data_availability: DataAvailability
  docx_storage_path: string | null
  word_count: number
}

// ── Pipeline Events (NDJSON streaming) ───────────────────────

export type PipelineEvent =
  | { type: 'run_started'; runId: string; topicCount: number }
  | { type: 'topic_started'; topicIndex: number; title: string }
  | {
      type: 'progress'
      topicIndex: number
      phase: 'keywords' | 'content'
      step: string
      detail: string
      pct: number
    }
  | {
      type: 'data_source'
      topicIndex: number
      source: keyof DataAvailability
      status: DataSourceStatus
    }
  | {
      type: 'topic_complete'
      topicIndex: number
      status: RunStatus
      wordCount?: number
    }
  | { type: 'topic_error'; topicIndex: number; error: string }
  | {
      type: 'run_complete'
      runId: string
      completedCount: number
      totalCount: number
    }
  | { type: 'error'; message: string }
  | { type: 'heartbeat'; topicIndex: number; stage: string }
  | { type: 'preflight'; source: string; ok: boolean; detail: string }

// ── Progress / DataSource Callbacks ──────────────────────────

export type HeartbeatCallback = (stage: string) => void

export type ProgressCallback = (
  phase: 'keywords' | 'content',
  step: string,
  detail: string,
  pct: number,
) => void

export type DataSourceCallback = (
  source: keyof DataAvailability,
  status: DataSourceStatus,
) => void
