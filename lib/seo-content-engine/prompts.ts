/**
 * SEO Content Engine — Prompt Templates
 * Ported from Python prompts/*.txt files.
 * Each function returns a formatted user message string.
 */
import { toJsonStr } from './utils'
import type { KeywordPlan, TopicInput } from './types'

// ── Keyword Generation (K1) ───────────────────────────────────

export function keywordGenerationPrompt(opts: {
  topic: TopicInput
  relatedKeywords: string[]
  pasfKeywords: string[]
  existingRankings: string[]
}): string {
  return `You are a senior SEO strategist generating keyword candidates for a content piece.

INPUT:
Topic: ${opts.topic.title}
Target Audience: ${opts.topic.target_audience ?? '(general)'}
Angle: ${opts.topic.angle ?? '(none specified)'}
Brand Context: ${opts.topic.brand_context ?? '(none)'}
Related Keywords (from data): ${opts.relatedKeywords.length ? opts.relatedKeywords.join(', ') : '(none available)'}
PASF Keywords (from data): ${opts.pasfKeywords.length ? opts.pasfKeywords.join(', ') : '(none available)'}
Existing Rankings (from GSC): ${opts.existingRankings.length ? opts.existingRankings.join(', ') : '(no existing URL provided)'}

OUTPUT JSON:
{
  "primary": [],
  "secondary": [],
  "supporting": [],
  "questions": []
}

CLASSIFICATION GUIDE:
- Primary: the exact terms you want to rank #1 for. High commercial or informational value. The page's core identity.
- Secondary: closely related terms that reinforce primary intent. Would naturally appear in well-written content on this topic.
- Supporting: long-tail, niche, or contextual terms. Low competition, specific. Help the page capture adjacent queries.
- Questions: real questions searchers ask. Must be specific enough to answer in 2–4 sentences. Avoid vague "what is X" unless the topic genuinely warrants a definition.

RULES:
- natural phrasing — write keywords as humans search them
- 2–5 word phrases preferred (1-word terms are almost always too broad)
- no fluff ("ultimate guide", "everything you need to know", "best ever")
- no generic drift — every keyword must be defensibly about THIS topic
- prefer keywords with clear intent over ambiguous ones
- if data-sourced keywords are provided, incorporate those terms (don't ignore real data in favor of guesses)
- for questions: "how to", "why does", "what happens when" > "what is"
- include local/geo modifiers if topic is location-relevant
- include comparison/vs keywords if topic involves a choice

TARGET COUNTS:
- Primary: 8–12
- Secondary: 15–20
- Supporting: 10–20
- Questions: 10–15

Return ONLY valid JSON. No commentary outside the JSON.`
}

// ── Keyword Scoring (K2) ──────────────────────────────────────

export function keywordScoringPrompt(opts: {
  topic: string
  candidates: string
  competitorGaps: string
  candidateMetrics: string
}): string {
  return `You are a senior SEO strategist evaluating keyword quality. Your job is to be critical. It is better to reject a mediocre keyword than to keep it.

INPUT:
Topic: ${opts.topic}
Keywords to evaluate: ${opts.candidates}
Competitor gap data (from data sources): ${opts.competitorGaps}
Keyword metrics (from data sources): ${opts.candidateMetrics}

OUTPUT JSON:
{
  "primary": [],
  "secondary": [],
  "supporting": [],
  "rejected": [
    {"keyword": "", "reason": ""}
  ],
  "rationale": "Brief explanation of scoring decisions, referencing metrics where available."
}

SCORING CRITERIA (apply all):
- Topic fit: Is this keyword genuinely about the topic, or adjacent/tangential?
- Search realism: Would a real person type this into Google?
- Intent clarity: Does this keyword have a clear, singular intent?
- Strategic value: Does ranking for this keyword move the needle? (consider MSV if available, CPC as commercial signal)
- Differentiation: If competitor gap data shows competitors already dominate a term, flag it. If a gap exists (competitors miss it), boost it.
- Specificity: Vague terms get rejected. "plumbing" = reject. "emergency plumber cost" = keep.
- Keywords with real MSV/CPC data should be preferred over unverified guesses (all else equal).

RULES:
- reject-first mindset. When in doubt, reject.
- do not fill quotas. If only 5 primary keywords survive, that's fine.
- reclassify freely. A submitted "primary" might actually be "supporting".
- every kept keyword must have a defensible reason to exist in the plan.
- if competitor gap data shows an opportunity, note it in the reason.

TARGET COUNTS (ideal, not mandatory):
- Primary: 8–12
- Secondary: 12–18
- Supporting: 8–15

Return ONLY valid JSON. No commentary outside the JSON.`
}

// ── Keyword Replacement (K4) ──────────────────────────────────

export function keywordReplacementPrompt(opts: {
  topic: string
  rejected: string
  currentPlan: string
  belowMinimum: string
}): string {
  return `You are replacing rejected keywords with stronger alternatives.

INPUT:
Topic: ${opts.topic}
Rejected keywords (with reasons): ${opts.rejected}
Current surviving keyword plan: ${opts.currentPlan}
Categories below minimum: ${opts.belowMinimum}

OUTPUT JSON:
[
  {"replacement": "", "replaces": "", "category": "primary|secondary|supporting|questions", "rationale": ""}
]

RULES:
- only generate replacements if the plan is BELOW minimum counts (primary < 8, secondary < 12, supporting < 8, questions < 10)
- each replacement must directly address the rejection reason of what it replaces
- do not duplicate anything already in the current plan
- preserve intent category (if replacing a primary, the replacement must be primary-worthy)
- prefer specificity over breadth
- natural phrasing only — real search queries, not awkward constructions
- if you cannot find a strong replacement, return an empty array. No filler.

Return ONLY valid JSON. No commentary outside the JSON.`
}

// ── Keyword Clustering (K5.5) ─────────────────────────────────

export function keywordClusteringPrompt(opts: {
  topic: string
  keywords: string[]
}): string {
  return `You are a semantic clustering expert. Group these keywords into coherent content clusters.

Topic: ${opts.topic}
Keywords: ${opts.keywords.join(', ')}

OUTPUT JSON:
[
  {"cluster_name": "", "keywords": [], "target_section": ""}
]

RULES:
- Each cluster should represent a distinct subtopic or angle
- target_section = the H2/H3 heading where these keywords should appear
- Every keyword must appear in exactly one cluster
- 5-10 clusters is typical for a comprehensive article
- Cluster names should be descriptive (not "Cluster 1")
- Flag any orphan keywords that don't fit cleanly into a group

Return ONLY valid JSON. No commentary outside the JSON.`
}

// ── Pre-Brief Analysis (A1+A2+A4+A5 merged) ──────────────────

export function preBriefAnalysisPrompt(opts: {
  topic: TopicInput
  keywordPlan: KeywordPlan
  serpData: unknown
}): string {
  const hasSerpData = opts.serpData && Object.keys(opts.serpData as object).length > 0
  return `You are a senior SEO strategist preparing context for a content brief. Analyze the topic and keyword plan, then return all four analysis objects in a single JSON response.

INPUT:
Topic: ${opts.topic.title}
Target Audience: ${opts.topic.target_audience ?? '(general)'}
Angle: ${opts.topic.angle ?? '(none specified)'}
Brand Context: ${opts.topic.brand_context ?? '(none)'}
Primary Keywords: ${toJsonStr(opts.keywordPlan.primary)}
Question Keywords: ${toJsonStr(opts.keywordPlan.questions)}
Full Keyword Plan: ${toJsonStr(opts.keywordPlan)}
SERP / Competitive Data: ${hasSerpData ? toJsonStr(opts.serpData) : '(unavailable — infer from topic and keywords)'}

OUTPUT JSON with exactly these four top-level keys:
{
  "entity_map": {
    "core_entities": [{"name": "", "relevance": "", "mention_frequency": ""}],
    "supporting_entities": [{"name": "", "relevance": "", "mention_frequency": ""}]
  },
  "intent_map": {
    "dominant_intent": "",
    "sub_intents": [],
    "user_goal": "",
    "success_criteria": ""
  },
  "competitive_diff": {
    "gaps": [],
    "opportunities": [],
    "differentiation_angle": ""
  },
  "content_strategy": {
    "angle": "",
    "emphasis": [],
    "structure_logic": "",
    "what_to_avoid": [],
    "geo_notes": ""
  }
}

RULES:
- entity_map: 5-8 core entities, 3-5 supporting. Focus on entities that MUST appear in the content.
- intent_map: dominant_intent must be one of: informational/commercial/navigational/transactional. Be specific.
- competitive_diff: use SERP data if available, otherwise infer from topic and keywords. 3-5 gaps, 3-5 opportunities.
- content_strategy.what_to_avoid must reference competitive_diff.gaps so the writer knows what not to replicate from competitors.

Return ONLY valid JSON. No commentary outside the JSON.`
}

// ── Content Brief (Phase B) ───────────────────────────────────

export function briefPrompt(opts: {
  topic: TopicInput
  entityMap: unknown
  intentMap: unknown
  keywordPlan: KeywordPlan
  serpData: unknown
  competitiveDiff: unknown
  contentStrategy: unknown
}): string {
  return `You are a senior SEO + GEO strategist creating a content brief. This brief will be the sole source of truth for the draft writer. Everything the writer needs must be in this brief.

INPUT:
- Topic Title: ${opts.topic.title}
- Target Audience: ${opts.topic.target_audience ?? '(general)'}
- Angle: ${opts.topic.angle ?? '(none specified)'}
- Brand Context: ${opts.topic.brand_context ?? '(none)'}
- Existing URL: ${opts.topic.existing_url ?? '(none)'}
- Entity Map: ${toJsonStr(opts.entityMap)}
- Intent Map: ${toJsonStr(opts.intentMap)}
- Keyword Plan: ${toJsonStr(opts.keywordPlan)}
- SERP Data: ${toJsonStr(opts.serpData)}
- Competitive Differentiation: ${toJsonStr(opts.competitiveDiff)}
- Content Strategy: ${toJsonStr(opts.contentStrategy)}

OUTPUT: A structured JSON brief matching this schema exactly:
{
  "title": "",
  "primary_keywords": [],
  "secondary_keywords": [],
  "supporting_keywords": [],
  "keyword_clusters": [
    {"cluster_name": "", "keywords": [], "target_section": ""}
  ],
  "questions": [],
  "intent": "",
  "sub_intents": [],
  "keyword_rationale": "",
  "serp_insights": "",
  "serp_features_present": [],
  "competitive_gaps": [],
  "outline": [
    {"heading": "", "key_points": [], "keywords_to_include": [], "estimated_word_count": 0}
  ],
  "key_points": [],
  "faq_set": [
    {"question": "", "answer": ""}
  ],
  "internal_links": [
    {"anchor": "", "destination": "", "reason": ""}
  ],
  "visual_notes": [],
  "geo_targets": [],
  "citation_hooks": [],
  "entity_definitions": {},
  "editorial_guidance": {
    "angle": "",
    "tone": "",
    "what_to_emphasize": [],
    "what_to_avoid": [],
    "differentiation_notes": ""
  },
  "schema_recommendations": [],
  "meta_title": "",
  "meta_description": ""
}

REQUIREMENTS:
- keyword_rationale must reference actual MSV/CPC/competition data when available. Do not say "high volume" without a number.
- serp_insights: summarize SERP features present (featured snippets, PAA boxes, etc.) based on the SERP Data input. If SERP data is empty or unavailable, set serp_insights to null — do NOT write explanations about missing data or API errors.
- outline must be a real editorial structure, not just H2 labels. Each section needs: heading, key points to cover, keywords to include, estimated word count.
- faq_set must contain exactly 3 questions from the keyword plan + answers written as complete, standalone sentences (GEO-optimized).
- geo_targets: 3–5 specific questions this content should be cited for in AI overviews.
- citation_hooks: 3–5 standalone factual statements designed to be extractable by AI engines. These must be specific and citable, not vague.
- entity_definitions: 1-sentence definition for each core entity. AI engines use these.
- editorial_guidance.differentiation_notes: based on competitive_differentiation input, explain what makes this content different from what currently ranks.
- meta_title: under 60 characters, includes primary keyword
- meta_description: under 155 characters, compelling, includes primary keyword

DO NOT:
- be generic ("write engaging content" = useless)
- ignore keyword priorities or metrics
- ignore intent classification
- create outlines that are just keyword lists disguised as headings
- omit the GEO fields

Return ONLY valid JSON. No commentary outside the JSON.`
}

// ── Draft Generation (Phase C) ────────────────────────────────

export function draftPrompt(brief: unknown): string {
  return `You are a content writer producing a long-form blog post from a provided brief.
The brief is the ONLY source of truth. Do not introduce topics, angles, or claims not in the brief.

INPUT:
${toJsonStr(brief)}

RULES:
- follow the outline section by section, in order
- hit the estimated word count per section (from the outline)
- place keywords from each cluster in their assigned target_section
- incorporate all primary keywords naturally. Secondary and supporting keywords where they fit.
- respect editorial_guidance.what_to_avoid strictly
- incorporate citation_hooks within natural prose — do not force them into unrelated paragraphs
- write FAQ answers as complete, standalone sentences a search engine or AI could extract verbatim
- include at least 1 comparison table, decision matrix, or structured data element
- define core entities on first mention using entity_definitions from the brief
- total word count: 2,000–2,500 words

STYLE:
- real blog voice — conversational authority, not textbook
- strong intro: frame the problem, create stakes, hint at what the reader will learn
- each section should transition naturally from the previous one
- include real-world context: tradeoffs, common mistakes, things most guides skip
- vary sentence length. Mix short punchy sentences with longer explanatory ones.
- use subheadings that match how people actually search (question format where appropriate)

GEO OPTIMIZATION:
- lead key paragraphs with a clear, specific, citable claim
- avoid hedging in important statements ("it depends" weakens AI extractability)
- answer questions directly first, then elaborate
- statistics and specific numbers are more citable than generalities

DO NOT:
- include internal brief metadata in the article — fields like serp_insights, keyword_rationale, editorial_guidance, and data availability notes are planning tools for you only, not article content
- mention API errors, missing data, or tool limitations anywhere in the article
- write like documentation or a manual
- use rigid formatting everywhere (not every section needs bullets)
- pad word count with filler
- introduce new angles or topics not in the brief
- ignore the brief's "what_to_avoid" list
- use AI-sounding phrases like "in today's digital landscape", "it's important to note", "navigating the complexities"

Output the full article as markdown. Start with the title as an H1, then the article body. No preamble or meta-commentary.`
}

// ── Draft Review (Phase D) ────────────────────────────────────

export function draftReviewPrompt(brief: unknown, draft: string): string {
  return `You are a senior editor reviewing a blog draft against its source brief.
Your job is quality control. Be specific about what's wrong and where.

INPUT:
Brief: ${toJsonStr(brief)}
Draft: ${draft}

OUTPUT JSON:
{
  "passed": false,
  "issues": [
    {"type": "missing_keyword|brief_drift|tone_violation|geo_gap|structure_skip", "detail": "", "severity": "critical|minor"}
  ],
  "missing_keywords": [],
  "word_count": 0,
  "geo_score": "strong|adequate|weak",
  "recommendation": "approve|revise"
}

CHECK:
1. Are all primary keywords present in the draft? List missing ones as "missing_keyword" issues with severity "critical".
2. Does each outline section from the brief appear in the draft? Missing sections are "structure_skip" with severity "critical".
3. Does the draft violate any item in editorial_guidance.what_to_avoid? Violations are "tone_violation" with severity "critical".
4. Are citation_hooks present in the text? Missing hooks are "geo_gap" with severity "minor".
5. Are FAQ answers written as complete standalone sentences? Fragments are "geo_gap" with severity "minor".
6. Is word count >= 1800? Under count is "structure_skip" with severity "critical".
7. Are there passages that read like documentation instead of a blog? Flag as "tone_violation" with severity "minor".
8. Is there at least 1 structured data element (table, comparison, etc.)? Missing is "geo_gap" with severity "minor".

RULES:
- "critical" severity = must fix before export.
- "minor" severity = note for metadata, do not block export.
- passed = true ONLY if zero critical issues.
- recommendation = "approve" if passed, "revise" if not.
- Count words accurately (split by whitespace).
- Be specific in detail — cite the exact keyword, section, or passage.

Return ONLY valid JSON. No commentary outside the JSON.`
}

// ── Draft Revision (Phase E) ──────────────────────────────────

export function draftRevisionPrompt(brief: unknown, draft: string, review: unknown): string {
  // Extract only critical issues + missing keywords from the review to reduce input tokens
  const r = review as Record<string, unknown>
  const allIssues = (r.issues as { type: string; detail: string; severity: string }[]) ?? []
  const criticalIssues = allIssues.filter((i) => i.severity === 'critical')
  const missingKeywords = (r.missing_keywords as string[]) ?? []

  return `You are a content writer making surgical fixes to a blog draft based on editorial review feedback.
Fix ONLY the critical issues listed below. Do NOT rewrite sections that are fine.

CURRENT DRAFT:
${draft}

CRITICAL ISSUES TO FIX (${criticalIssues.length}):
${criticalIssues.map((i, idx) => `${idx + 1}. [${i.type}] ${i.detail}`).join('\n')}

${missingKeywords.length > 0 ? `MISSING KEYWORDS TO ADD:\n${missingKeywords.join(', ')}\n` : ''}
OUTPUT FORMAT:
For each fix, output the revised section using this format:

:::fix <section_heading>
<revised content for this section only>
:::

Only output the sections that need changes. Do NOT output unchanged sections.
If a fix applies to the introduction (before the first heading), use ":::fix Introduction".

RULES:
- Fix every critical issue listed above
- Incorporate missing keywords naturally into relevant sections
- Maintain the same tone, voice, and style as the original
- Keep each section's word count similar to the original (do not truncate)
- Do not add content that wasn't part of the original topic
- Do not output the full article — only changed sections

No preamble or meta-commentary. Start directly with :::fix blocks.`
}
