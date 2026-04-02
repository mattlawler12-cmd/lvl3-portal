/**
 * SEO Content Engine — Keyword Engine (K1-K6)
 * Ported from Python keyword_engine.py
 */
import type {
  TopicInput,
  KeywordPlan,
  KeywordMetrics,
  KeywordCluster,
  RejectedKeyword,
  ProgressCallback,
} from './types'
import { KEYWORD_TARGETS } from './config'
import { mergeDedup, toJsonStr } from './utils'
import {
  keywordGenerationPrompt,
  keywordScoringPrompt,
  keywordReplacementPrompt,
  keywordClusteringPrompt,
} from './prompts'
import type { SeoAnthropicClient } from './anthropic-client'
import type { DataSources } from './data-sources'

export class KeywordEngine {
  private llm: SeoAnthropicClient
  private dataSources: DataSources
  private onProgress: ProgressCallback
  private seedMetrics: Record<string, KeywordMetrics> = {}

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
    this.onProgress('keywords', step, detail, pct)
  }

  async run(topic: TopicInput): Promise<KeywordPlan> {
    // K1 — Generate candidates
    this.progress('K1', 'Gathering data + generating keyword candidates', 0.05)
    let { primary, secondary, supporting, questions } = await this.k1Generate(topic)
    this.progress(
      'K1',
      `Generated ${primary.length} primary, ${secondary.length} secondary, ${supporting.length} supporting, ${questions.length} questions`,
      0.2,
    )

    // K2 — Score + classify
    this.progress('K2', 'Scoring and classifying keywords (reject-first)', 0.25)
    const scored = await this.k2Score(topic, primary, secondary, supporting, questions)
    primary = scored.primary
    secondary = scored.secondary
    supporting = scored.supporting
    questions = scored.questions
    const rejected = scored.rejected
    const rationale = scored.rationale
    const total = primary.length + secondary.length + supporting.length + questions.length
    this.progress('K2', `Kept ${total} keywords, rejected ${rejected.length}`, 0.4)

    // K4 — Replace if needed
    this.progress('K4', 'Checking category minimums', 0.45)
    const replaced = await this.k4Replace(topic, primary, secondary, supporting, questions, rejected)
    primary = replaced.primary
    secondary = replaced.secondary
    supporting = replaced.supporting
    questions = replaced.questions
    this.progress('K4', `Post-replacement: ${primary.length}P / ${secondary.length}S / ${supporting.length}Sp / ${questions.length}Q`, 0.55)

    // K5 — Enrich with metrics
    const allCount = primary.length + secondary.length + supporting.length + questions.length
    this.progress('K5', `Enriching ${allCount} keywords with metrics`, 0.6)
    const metrics = await this.k5Enrich(primary, secondary, supporting, questions)
    const enriched = Object.values(metrics).filter(Boolean).length
    this.progress('K5', `Metrics for ${enriched}/${allCount} keywords`, 0.7)

    // K5.5 — Semantic clustering
    this.progress('K5.5', `Clustering ${allCount} keywords semantically`, 0.75)
    const { clusters, orphans } = await this.k55Cluster(topic, primary, secondary, supporting, questions)
    this.progress('K5.5', `${clusters.length} clusters formed, ${orphans.length} orphans`, 0.85)

    // K6 — Finalize
    this.progress('K6', 'Finalizing keyword plan', 0.9)
    const plan: KeywordPlan = {
      primary,
      secondary,
      supporting,
      questions,
      clusters,
      rejected,
      rationale,
      metrics,
    }
    this.progress(
      'K6',
      `Final: ${plan.primary.length}P / ${plan.secondary.length}S / ${plan.supporting.length}Sp / ${plan.questions.length}Q / ${plan.clusters.length} clusters`,
      1.0,
    )
    return plan
  }

  // ── K1: Generate Candidates ────────────────────────────────────

  private async k1Generate(topic: TopicInput) {
    // Extract seed keywords from spreadsheet
    const seedPrimary: string[] = []
    const seedSecondary: string[] = []
    const seedSupporting: string[] = []
    const seedQuestions: string[] = []

    if (topic.seed_keywords?.length) {
      for (const sk of topic.seed_keywords) {
        const bucket =
          sk.keyword_type === 'primary' ? seedPrimary
          : sk.keyword_type === 'supporting' ? seedSupporting
          : sk.keyword_type === 'questions' ? seedQuestions
          : seedSecondary
        bucket.push(sk.keyword)

        if (sk.volume || sk.cpc || sk.competition) {
          this.seedMetrics[sk.keyword] = {
            msv: sk.volume,
            cpc: sk.cpc,
            competition: sk.competition,
          }
        }
      }
    }

    // Gather data from connectors in parallel (related, PASF, GSC)
    const [related, pasfKeywords, existingRankings] = await Promise.all([
      this.dataSources.getRelatedKeywords(topic.title),
      this.dataSources.getPasfKeywords(topic.title),
      topic.existing_url
        ? this.dataSources.getTopQueries().then((gscRows) =>
            gscRows
              .filter((r) => r.page?.includes(topic.existing_url!))
              .map((r) => r.query)
              .slice(0, 50),
          )
        : Promise.resolve([] as string[]),
    ])

    // LLM call
    let seedContext = ''
    if (topic.seed_keywords?.length) {
      seedContext = `\n\nPRE-RESEARCHED SEED KEYWORDS (from spreadsheet — incorporate these, they are already validated with real metrics):\n  Primary: ${JSON.stringify(seedPrimary)}\n  Secondary: ${JSON.stringify(seedSecondary)}\n  Supporting: ${JSON.stringify(seedSupporting)}\n  Questions: ${JSON.stringify(seedQuestions)}\n`
    }

    const userPrompt =
      keywordGenerationPrompt({
        topic,
        relatedKeywords: related,
        pasfKeywords,
        existingRankings,
      }) + seedContext

    const response = (await this.llm.callJson(
      'keyword_gen',
      'You are a senior SEO keyword strategist.',
      userPrompt,
    )) as Record<string, unknown> | null

    if (!response) throw new Error('K1 — LLM returned no parseable JSON')

    const llmPrimary = (response.primary as string[]) ?? []
    const llmSecondary = (response.secondary as string[]) ?? []
    const llmSupporting = (response.supporting as string[]) ?? []
    const llmQuestions = (response.questions as string[]) ?? []

    // Merge: seed → LLM → data sources (cap related to avoid K2 overload)
    return {
      primary: mergeDedup(seedPrimary, llmPrimary),
      secondary: mergeDedup(seedSecondary, llmSecondary, related.slice(0, 30)),
      supporting: mergeDedup(seedSupporting, llmSupporting),
      questions: mergeDedup(seedQuestions, llmQuestions),
    }
  }

  // ── K2: Score + Classify ───────────────────────────────────────

  private async k2Score(
    topic: TopicInput,
    primary: string[],
    secondary: string[],
    supporting: string[],
    questions: string[],
  ) {
    // Get competitor gap data
    const competitorGap = topic.existing_url
      ? await this.dataSources.getCompetitorKeywordGap(
          new URL(topic.existing_url).hostname,
        )
      : []

    // Cap candidates per category to avoid K2 prompt/response overload
    const cappedPrimary = primary.slice(0, 20)
    const cappedSecondary = secondary.slice(0, 40)
    const cappedSupporting = supporting.slice(0, 30)
    const cappedQuestions = questions.slice(0, 25)

    // Get metrics for scoring context — merge seed metrics with live data
    const allCandidates = mergeDedup(cappedPrimary, cappedSecondary, cappedSupporting, cappedQuestions)
    const fetchedMetrics = await this.dataSources.getKeywordVolumeBatch(
      allCandidates.slice(0, 100), // Limit to avoid API overload
    )
    // Seed metrics from XLSX take priority, then fill gaps with live data
    const candidateMetrics = { ...fetchedMetrics, ...this.seedMetrics }

    const userPrompt = keywordScoringPrompt({
      topic: toJsonStr(topic),
      candidates: toJsonStr({ primary: cappedPrimary, secondary: cappedSecondary, supporting: cappedSupporting, questions: cappedQuestions }),
      competitorGaps: competitorGap.length
        ? toJsonStr(competitorGap.slice(0, 50))
        : '(not available)',
      candidateMetrics: Object.keys(candidateMetrics).length
        ? toJsonStr(candidateMetrics)
        : '(not available)',
    })

    const response = (await this.llm.callJson(
      'keyword_scoring',
      'You are a senior SEO keyword strategist. Apply reject-first methodology.',
      userPrompt,
    )) as Record<string, unknown> | null

    // Non-fatal — if scoring fails, pass through the original candidates unscored
    if (!response) {
      console.warn('K2 — LLM returned no parseable JSON, using unscored candidates')
      return {
        primary: cappedPrimary,
        secondary: cappedSecondary,
        supporting: cappedSupporting,
        questions: cappedQuestions,
        rejected: [],
        rationale: 'Scoring unavailable — using K1 candidates directly',
      }
    }

    return {
      primary: (response.primary as string[]) ?? primary,
      secondary: (response.secondary as string[]) ?? secondary,
      supporting: (response.supporting as string[]) ?? supporting,
      questions: (response.questions as string[]) ?? questions,
      rejected: (response.rejected as RejectedKeyword[]) ?? [],
      rationale: (response.rationale as string) ?? '',
    }
  }

  // ── K4: Replace if Needed ──────────────────────────────────────

  private async k4Replace(
    topic: TopicInput,
    primary: string[],
    secondary: string[],
    supporting: string[],
    questions: string[],
    rejected: RejectedKeyword[],
  ) {
    const categories: Record<string, string[]> = { primary, secondary, supporting, questions }
    const belowMinimum: Record<string, { current: number; minimum: number; deficit: number }> = {}

    for (const [cat, keywords] of Object.entries(categories)) {
      const min = KEYWORD_TARGETS[cat]?.min ?? 0
      if (keywords.length < min) {
        belowMinimum[cat] = { current: keywords.length, minimum: min, deficit: min - keywords.length }
      }
    }

    if (Object.keys(belowMinimum).length === 0) {
      return { primary, secondary, supporting, questions }
    }

    const userPrompt = keywordReplacementPrompt({
      topic: toJsonStr(topic),
      rejected: toJsonStr(rejected),
      currentPlan: toJsonStr(categories),
      belowMinimum: toJsonStr(belowMinimum),
    })

    let response = await this.llm.callJson(
      'keyword_replacement',
      'You are a senior SEO keyword strategist. Generate replacement keywords for categories below minimum counts.',
      userPrompt,
    )

    if (!response) throw new Error('K4 — LLM returned no parseable JSON')

    // Normalize: flat array → dict by category
    if (Array.isArray(response)) {
      const byCat: Record<string, string[]> = {}
      for (const item of response) {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          const kw = (obj.replacement ?? obj.keyword ?? obj.term ?? '') as string
          const cat = (obj.category as string) ?? 'secondary'
          if (kw) {
            if (!byCat[cat]) byCat[cat] = []
            byCat[cat].push(kw)
          }
        }
      }
      response = byCat
    }

    const resp = response as Record<string, unknown>
    return {
      primary: resp.primary ? mergeDedup(primary, resp.primary as string[]) : primary,
      secondary: resp.secondary ? mergeDedup(secondary, resp.secondary as string[]) : secondary,
      supporting: resp.supporting ? mergeDedup(supporting, resp.supporting as string[]) : supporting,
      questions: resp.questions ? mergeDedup(questions, resp.questions as string[]) : questions,
    }
  }

  // ── K5: Enrich with Metrics ────────────────────────────────────

  private async k5Enrich(
    primary: string[],
    secondary: string[],
    supporting: string[],
    questions: string[],
  ): Promise<Record<string, KeywordMetrics>> {
    const allKeywords = mergeDedup(primary, secondary, supporting, questions)

    // Start with seed metrics from xlsx
    const metrics: Record<string, KeywordMetrics> = { ...this.seedMetrics }

    // Only look up keywords without seed metrics
    const missing = allKeywords.filter((kw) => !metrics[kw])
    if (missing.length) {
      const fetched = await this.dataSources.getKeywordVolumeBatch(missing)
      Object.assign(metrics, fetched)
    }

    return metrics
  }

  // ── K5.5: Semantic Clustering ──────────────────────────────────

  private async k55Cluster(
    topic: TopicInput,
    primary: string[],
    secondary: string[],
    supporting: string[],
    questions: string[],
  ): Promise<{ clusters: KeywordCluster[]; orphans: string[] }> {
    const allKeywords = mergeDedup(primary, secondary, supporting, questions)

    const userPrompt = keywordClusteringPrompt({
      topic: topic.title,
      keywords: allKeywords,
    })

    const response = await this.llm.callJson(
      'keyword_clustering',
      'You are an SEO strategist. Group these keywords into semantic clusters.',
      userPrompt,
    )

    // Non-fatal — if clustering fails, treat all keywords as orphans
    if (!response) {
      console.warn('K5.5 — LLM returned no parseable JSON, skipping clustering')
      return { clusters: [], orphans: allKeywords }
    }

    const clusters: KeywordCluster[] = Array.isArray(response)
      ? (response as KeywordCluster[])
      : ((response as Record<string, unknown>).clusters as KeywordCluster[]) ?? []

    // Find orphan keywords not in any cluster
    const clustered = new Set<string>()
    for (const c of clusters) {
      for (const kw of c.keywords ?? []) {
        clustered.add(kw.trim().toLowerCase())
      }
    }

    const orphans = allKeywords.filter(
      (kw) => !clustered.has(kw.trim().toLowerCase()),
    )

    return { clusters, orphans }
  }
}
