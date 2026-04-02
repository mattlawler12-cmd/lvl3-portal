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
import { toJsonStr } from './utils'
import {
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

    // ── Phase A: Build data layers ─────────────────────────────
    this.progress('A1', 'Building entity map', 0.05)
    const entityMap = await this.safePhase('entity_map', result, () =>
      this.buildEntityMap(topic, keywordPlan),
    )

    this.progress('A2', 'Building intent map', 0.12)
    const intentMap = await this.safePhase('intent_map', result, () =>
      this.buildIntentMap(topic, keywordPlan),
    )

    this.progress('A3', 'Gathering SERP data', 0.18)
    const serpData = await this.safePhase('serp_data', result, () =>
      this.gatherSerpData(topic, keywordPlan),
    )

    this.progress('A4', 'Building competitive diff', 0.25)
    const competitiveDiff = await this.safePhase('competitive_diff', result, () =>
      this.buildCompetitiveDiff(topic, keywordPlan, serpData ?? {}),
    )

    this.progress('A5', 'Building content strategy', 0.32)
    const contentStrategy = await this.safePhase('content_strategy', result, () =>
      this.buildContentStrategy(topic, keywordPlan, serpData ?? {}, competitiveDiff ?? {}),
    )

    this.progress('A', 'Data layers complete', 0.38)

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

  // ── Phase A: Data-layer builders ─────────────────────────────

  private async buildEntityMap(
    topic: TopicInput,
    keywordPlan: KeywordPlan,
  ): Promise<Record<string, unknown>> {
    const userMsg = `Topic: ${topic.title}
Target audience: ${topic.target_audience ?? '(general)'}
Angle: ${topic.angle ?? '(none specified)'}
Brand context: ${topic.brand_context ?? '(none)'}

Keyword plan:
${toJsonStr(keywordPlan)}

Return JSON with:
  "core_entities": [{"name": "", "relevance": "", "mention_frequency": ""}]  (5-8 items)
  "supporting_entities": [{"name": "", "relevance": "", "mention_frequency": ""}]  (3-5 items)`

    const raw = await this.llm.callJson(
      'entity_map',
      'You are an SEO content strategist. Identify the core entities for this content piece.',
      userMsg,
    )
    if (!raw) throw new Error('LLM returned no parseable JSON for entity map')
    return raw as Record<string, unknown>
  }

  private async buildIntentMap(
    topic: TopicInput,
    keywordPlan: KeywordPlan,
  ): Promise<Record<string, unknown>> {
    const userMsg = `Topic: ${topic.title}
Target audience: ${topic.target_audience ?? '(general)'}
Angle: ${topic.angle ?? '(none specified)'}

Primary keywords: ${keywordPlan.primary.join(', ')}
Question keywords: ${keywordPlan.questions.join(', ')}

Return JSON with:
  "dominant_intent": "",
  "sub_intents": [],
  "user_goal": "",
  "success_criteria": ""`

    const raw = await this.llm.callJson(
      'intent_map',
      'You are an SEO content strategist. Determine the search intent profile for this content piece.',
      userMsg,
    )
    if (!raw) throw new Error('LLM returned no parseable JSON for intent map')
    return raw as Record<string, unknown>
  }

  private async gatherSerpData(
    topic: TopicInput,
    keywordPlan: KeywordPlan,
  ): Promise<Record<string, unknown>> {
    const serpFeatures: Record<string, unknown> = {}
    const page1Rankings: Record<string, unknown> = {}
    let anyData = false

    for (const kw of keywordPlan.primary.slice(0, 3)) {
      const sf = await this.dataSources.getSerpFeatures(kw)
      if (sf) {
        serpFeatures[kw] = sf
        anyData = true
      }
      const p1 = await this.dataSources.getPage1Rankings(kw)
      if (p1) {
        page1Rankings[kw] = p1
        anyData = true
      }
    }

    const contentBriefSeed = await this.dataSources.getContentBrief(topic.title)
    if (contentBriefSeed) anyData = true

    if (!anyData) return {}

    return {
      serp_features: serpFeatures,
      page1_rankings: page1Rankings,
      content_brief_seed: contentBriefSeed ?? {},
    }
  }

  private async buildCompetitiveDiff(
    topic: TopicInput,
    keywordPlan: KeywordPlan,
    serpData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Trim SERP data
    const trimmed: Record<string, unknown> = {}
    if (serpData.serp_features) {
      const sf = serpData.serp_features as Record<string, unknown>
      const entries = Object.entries(sf).slice(0, 3)
      trimmed.serp_features = Object.fromEntries(entries)
    }
    if (serpData.page1_rankings) {
      const p1 = serpData.page1_rankings as Record<string, unknown>
      const trimmedP1: Record<string, unknown> = {}
      for (const [kw, rankings] of Object.entries(p1).slice(0, 3)) {
        trimmedP1[kw] = Array.isArray(rankings) ? rankings.slice(0, 5) : rankings
      }
      trimmed.page1_rankings = trimmedP1
    }
    if (serpData.content_brief_seed) {
      const cbs = String(serpData.content_brief_seed).slice(0, 800)
      trimmed.content_brief_seed = cbs
    }

    const serpSummary = Object.keys(trimmed).length ? toJsonStr(trimmed) : '(SERP data unavailable)'

    const userMsg = `Topic: ${topic.title}
Angle: ${topic.angle ?? '(none specified)'}

Primary keywords: ${keywordPlan.primary.slice(0, 8).join(', ')}

SERP / page-1 data:
${serpSummary}

Analyze what the current top-ranking pages cover and identify what they miss.
If SERP data is unavailable, infer gaps from the topic and keywords.

Return compact JSON (no extra whitespace) with exactly these keys:
{"gaps":["..."],"opportunities":["..."],"differentiation_angle":"..."}`

    const raw = await this.llm.callJson(
      'competitive_diff',
      'You are an SEO competitive analyst. Given SERP data and a topic, identify content gaps and differentiation angles. Return ONLY valid JSON, no commentary.',
      userMsg,
    )
    if (!raw) throw new Error('LLM returned no parseable JSON for competitive diff')
    return raw as Record<string, unknown>
  }

  private async buildContentStrategy(
    topic: TopicInput,
    keywordPlan: KeywordPlan,
    serpData: Record<string, unknown>,
    competitiveDiff: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const userMsg = `Topic: ${topic.title}
Target audience: ${topic.target_audience ?? '(general)'}
Angle: ${topic.angle ?? '(none specified)'}
Brand context: ${topic.brand_context ?? '(none)'}

Primary keywords: ${keywordPlan.primary.join(', ')}

SERP data:
${toJsonStr(serpData)}

Competitive diff:
${toJsonStr(competitiveDiff)}

Return JSON with:
  "angle": "",
  "emphasis": [],
  "structure_logic": "",
  "what_to_avoid": [],
  "geo_notes": ""`

    const raw = await this.llm.callJson(
      'content_strategy',
      'You are a senior SEO content strategist. Synthesize all available data into a clear content strategy for the writer.',
      userMsg,
    )
    if (!raw) throw new Error('LLM returned no parseable JSON for content strategy')
    return raw as Record<string, unknown>
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
