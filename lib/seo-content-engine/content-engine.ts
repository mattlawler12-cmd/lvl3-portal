/**
 * SEO Content Engine — Content Pipeline (Phases A-F)
 * Ported from Python content_engine.py
 */
import type {
  TopicInput,
  KeywordPlan,
  ContentBrief,
  DraftReview,
  RunMode,
  ProgressCallback,
} from './types'
import { DRAFT_REVIEW_ENABLED, MAX_REVISION_ATTEMPTS, MIN_WORD_COUNT } from './config'
import {
  preBriefAnalysisPrompt,
  briefPrompt,
  draftPrompt,
  draftReviewPrompt,
  draftRevisionPrompt,
} from './prompts'
import type { SeoAnthropicClient } from './anthropic-client'
import type { DataSources } from './data-sources'

const BRIEF_REQUIRED_KEYS = new Set([
  'title',
  'primary_keywords',
  'outline',
  'geo_targets',
  'citation_hooks',
  'entity_definitions',
  'editorial_guidance',
  'meta_title',
  'meta_description',
])

interface ContentResult {
  brief: ContentBrief | null
  draft: string | null
  draftReview: DraftReview | null
  revisedDraft: string | null
  error: string | null
  warnings: string[]
  wordCount: number
}

export class ContentEngine {
  private llm: SeoAnthropicClient
  private dataSources: DataSources
  private onProgress: ProgressCallback

  constructor(
    llm: SeoAnthropicClient,
    dataSources: DataSources,
    onProgress: ProgressCallback,
  ) {
    this.llm = llm
    this.dataSources = dataSources
    this.onProgress = onProgress
  }

  private progress(step: string, detail: string, pct: number) {
    this.onProgress('content', step, detail, pct)
  }

  async run(
    topic: TopicInput,
    keywordPlan: KeywordPlan,
    mode: RunMode,
  ): Promise<ContentResult> {
    const result: ContentResult = {
      brief: null,
      draft: null,
      draftReview: null,
      revisedDraft: null,
      error: null,
      warnings: [],
      wordCount: 0,
    }

    if (mode === 'keywords_only') return result

    // ── Phase A: SERP data + pre-brief analysis in parallel ────
    this.progress('A', 'Gathering SERP data + building analysis layers in parallel', 0.05)

    const [serpData, preBriefData] = await Promise.all([
      this.safePhase('serp_data', result, () =>
        this.gatherSerpData(topic, keywordPlan),
      ),
      this.safePhase('pre_brief_analysis', result, () =>
        this.runPreBriefAnalysis(topic, keywordPlan),
      ),
    ])

    const entityMap = (preBriefData as Record<string, unknown> | null)?.entity_map as Record<string, unknown> ?? {}
    const intentMap = (preBriefData as Record<string, unknown> | null)?.intent_map as Record<string, unknown> ?? {}
    const competitiveDiff = (preBriefData as Record<string, unknown> | null)?.competitive_diff as Record<string, unknown> ?? {}
    const contentStrategy = (preBriefData as Record<string, unknown> | null)?.content_strategy as Record<string, unknown> ?? {}

    this.progress('A', 'Analysis layers complete', 0.35)

    // ── Phase B: Generate brief ────────────────────────────────
    this.progress('B', 'Generating content brief from all data layers', 0.4)
    const brief = await this.safePhase('brief', result, () =>
      this.generateBrief(
        topic,
        entityMap ?? {},
        intentMap ?? {},
        keywordPlan,
        serpData ?? {},
        competitiveDiff ?? {},
        contentStrategy ?? {},
      ),
    )

    if (!brief) {
      this.progress('B', 'Brief generation failed', 0.45)
      result.error = result.error ?? 'Brief generation failed'
      return result
    }
    result.brief = brief as unknown as ContentBrief
    const outlineCount = (brief as Record<string, unknown>).outline
      ? ((brief as Record<string, unknown>).outline as unknown[]).length
      : 0
    const geoCount = (brief as Record<string, unknown>).geo_targets
      ? ((brief as Record<string, unknown>).geo_targets as unknown[]).length
      : 0
    this.progress('B', `Brief complete — ${outlineCount} outline sections, ${geoCount} GEO targets`, 0.5)

    if (mode === 'brief') return result

    // ── Phase C: Generate draft ────────────────────────────────
    this.progress('C', 'Writing full draft article from brief', 0.55)
    const draft = await this.safePhase('draft', result, () =>
      this.generateDraft(brief),
    )
    if (!draft) {
      this.progress('C', 'Draft generation failed', 0.6)
      result.error = result.error ?? 'Draft generation failed'
      return result
    }
    result.draft = draft as string
    const wc = (draft as string).split(/\s+/).length
    result.wordCount = wc
    this.progress('C', `Draft complete — ${wc.toLocaleString()} words`, 0.7)

    // ── Phase D: Review draft ──────────────────────────────────
    if (DRAFT_REVIEW_ENABLED) {
      this.progress('D', 'Reviewing draft against brief', 0.72)
      const review = await this.safePhase('draft_review', result, () =>
        this.reviewDraft(brief, draft as string),
      )
      if (review) {
        result.draftReview = review as DraftReview
        const r = review as DraftReview
        const critCount = r.issues.filter((i) => i.severity === 'critical').length
        const statusLabel = r.passed ? 'PASS' : `FAIL — ${critCount} critical issues`
        this.progress('D', `Review: ${statusLabel}, GEO score: ${r.geo_score}`, 0.78)

        // ── Phase E: Revise if critical ────────────────────────
        const hasCritical = r.issues.some((i) => i.severity === 'critical')
        if (hasCritical && MAX_REVISION_ATTEMPTS > 0) {
          this.progress('E', 'Revising draft to fix critical issues', 0.8)
          const revised = await this.reviseLoop(brief, draft as string, r, result)
          if (revised) {
            result.revisedDraft = revised
            const rwc = revised.split(/\s+/).length
            result.wordCount = rwc
            this.progress('E', `Revision complete — ${rwc.toLocaleString()} words`, 0.88)
          } else {
            this.progress('E', 'Revision could not resolve all issues', 0.88)
          }
        }
      }
    }

    // ── Phase F: Validation ────────────────────────────────────
    this.progress('F', 'Running validation checks', 0.9)
    if (topic.existing_url) {
      const crawl = await this.dataSources.crawlPage(topic.existing_url)
      if (crawl) {
        result.warnings.push(`Existing URL crawl data available for: ${topic.existing_url}`)
      }
    }

    // Word-count guard
    const finalWc = result.wordCount
    if (finalWc && finalWc < MIN_WORD_COUNT) {
      result.warnings.push(
        `Final draft is ${finalWc} words — below minimum of ${MIN_WORD_COUNT}`,
      )
    }
    this.progress('F', `Pipeline complete — ${finalWc.toLocaleString()} words final`, 1.0)

    return result
  }

  // ── Phase A: Pre-brief analysis (merged A1+A2+A4+A5) ─────────

  private async runPreBriefAnalysis(
    topic: TopicInput,
    keywordPlan: KeywordPlan,
    serpData: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const userMsg = preBriefAnalysisPrompt({ topic, keywordPlan, serpData })
    const raw = await this.llm.callJson(
      'pre_brief_analysis',
      'You are a senior SEO strategist. Return all four analysis objects as a single JSON response.',
      userMsg,
    )
    if (!raw || Array.isArray(raw)) throw new Error('LLM returned no parseable JSON for pre-brief analysis')
    return raw as Record<string, unknown>
  }

  private async gatherSerpData(
    topic: TopicInput,
    keywordPlan: KeywordPlan,
  ): Promise<Record<string, unknown>> {
    const serpFeatures: Record<string, unknown> = {}
    const page1Rankings: Record<string, unknown> = {}
    let anyData = false

    const topKeywords = keywordPlan.primary.slice(0, 3)

    // Run all SERP queries + content brief in parallel
    const [contentBriefSeed, ...serpResults] = await Promise.all([
      this.dataSources.getContentBrief(topic.title),
      ...topKeywords.flatMap((kw) => [
        this.dataSources.getSerpFeatures(kw).then((sf) => ({ kw, type: 'serp' as const, data: sf })),
        this.dataSources.getPage1Rankings(kw).then((p1) => ({ kw, type: 'p1' as const, data: p1 })),
      ]),
    ])

    for (const r of serpResults) {
      if (r.data) {
        anyData = true
        if (r.type === 'serp') serpFeatures[r.kw] = r.data
        else page1Rankings[r.kw] = r.data
      }
    }

    if (contentBriefSeed) anyData = true
    if (!anyData) return {}

    return {
      serp_features: serpFeatures,
      page1_rankings: page1Rankings,
      content_brief_seed: contentBriefSeed ?? {},
    }
  }

  // ── Phase B: Brief ───────────────────────────────────────────

  private async generateBrief(
    topic: TopicInput,
    entityMap: Record<string, unknown>,
    intentMap: Record<string, unknown>,
    keywordPlan: KeywordPlan,
    serpData: Record<string, unknown>,
    competitiveDiff: Record<string, unknown>,
    contentStrategy: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const userMsg = briefPrompt({
      topic,
      entityMap,
      intentMap,
      keywordPlan,
      serpData,
      competitiveDiff,
      contentStrategy,
    })

    const raw = await this.llm.callJson(
      'brief',
      'You are a senior SEO content director. Produce a comprehensive content brief as a single JSON object.',
      userMsg,
    )
    if (!raw || Array.isArray(raw)) throw new Error('LLM returned no parseable JSON for brief')

    // Fill missing required keys
    for (const key of Array.from(BRIEF_REQUIRED_KEYS)) {
      if (!(key in raw)) {
        const arrayKeys = ['primary_keywords', 'outline', 'geo_targets', 'citation_hooks']
        ;(raw as Record<string, unknown>)[key] = arrayKeys.includes(key) ? [] : key === 'entity_definitions' ? {} : ''
      }
    }

    return raw as Record<string, unknown>
  }

  // ── Phase C: Draft ───────────────────────────────────────────

  private async generateDraft(brief: unknown): Promise<string> {
    const userMsg = draftPrompt(brief)
    const draft = await this.llm.call(
      'draft',
      'You are an expert SEO content writer. Produce a publication-ready article in Markdown based on the brief provided.',
      userMsg,
    )
    if (!draft?.trim()) throw new Error('LLM returned empty draft')
    return draft.trim()
  }

  // ── Phase D: Review ──────────────────────────────────────────

  private async reviewDraft(
    brief: unknown,
    draftText: string,
  ): Promise<DraftReview> {
    const userMsg = draftReviewPrompt(brief, draftText)
    const raw = (await this.llm.callJson(
      'draft_review',
      'You are an SEO editorial reviewer. Evaluate the draft against the brief and return structured feedback as JSON.',
      userMsg,
    )) as Record<string, unknown> | null

    if (!raw) throw new Error('LLM returned no parseable JSON for draft review')

    const actualWordCount = draftText.split(/\s+/).length
    return {
      passed: (raw.passed as boolean) ?? false,
      issues: (raw.issues as DraftReview['issues']) ?? [],
      missing_keywords: (raw.missing_keywords as string[]) ?? [],
      word_count: actualWordCount,
      geo_score: (raw.geo_score as DraftReview['geo_score']) ?? 'weak',
      recommendation: (raw.recommendation as DraftReview['recommendation']) ?? 'revise',
    }
  }

  // ── Phase E: Revision ────────────────────────────────────────

  private async reviseDraft(
    brief: unknown,
    draftText: string,
    review: DraftReview,
  ): Promise<string> {
    const userMsg = draftRevisionPrompt(brief, draftText, review)
    const revised = await this.llm.call(
      'draft_revision',
      'You are revising a blog draft based on editorial feedback. Fix ONLY the critical issues listed.',
      userMsg,
    )
    if (!revised?.trim()) throw new Error('LLM returned empty revision')
    return revised.trim()
  }

  private async reviseLoop(
    brief: unknown,
    draft: string,
    review: DraftReview,
    result: ContentResult,
  ): Promise<string | null> {
    let currentDraft = draft
    let currentReview = review

    for (let attempt = 1; attempt <= MAX_REVISION_ATTEMPTS; attempt++) {
      const revised = await this.safePhase(`draft_revision_${attempt}`, result, () =>
        this.reviseDraft(brief, currentDraft, currentReview),
      )
      if (!revised) break

      const newReview = await this.safePhase(`draft_re_review_${attempt}`, result, () =>
        this.reviewDraft(brief, revised as string),
      )

      if (newReview) {
        result.draftReview = newReview as DraftReview
        const r = newReview as DraftReview
        if (!r.issues.some((i) => i.severity === 'critical')) {
          return revised as string
        }
        currentReview = r
      }
      currentDraft = revised as string
    }

    return currentDraft !== draft ? currentDraft : null
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async safePhase<T>(
    phaseName: string,
    result: ContentResult,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await fn()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Phase '${phaseName}' failed: ${msg}`)
      result.warnings.push(`Phase '${phaseName}' failed: ${msg}`)
      if (!result.error) result.error = `Phase '${phaseName}' failed: ${msg}`
      return null
    }
  }
}
