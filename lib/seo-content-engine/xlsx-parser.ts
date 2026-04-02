/**
 * SEO Content Engine — XLSX Parser
 * Parses Topics + Keywords tabs from uploaded spreadsheets.
 * Ported from Python utils.py parse_xlsx_input()
 */
import * as XLSX from 'xlsx'
import type { TopicInput, SeedKeyword } from './types'
import { fuzzyTopicMatch } from './utils'

/**
 * Parse an XLSX buffer into TopicInput[].
 * Expects two sheets:
 *   - "Topics" with columns: Title, Angle, Target_Audience, Existing_URL, Brand_Context
 *   - "Keywords" with columns: topic, keyword, keyword_type, volume, cpc, competition, etc.
 */
export function parseXlsx(data: ArrayBuffer): TopicInput[] {
  const workbook = XLSX.read(data, { type: 'array' })

  // Find sheets (case-insensitive)
  const sheetNames = workbook.SheetNames
  const topicsSheet = sheetNames.find((n) => n.toLowerCase() === 'topics')
  const keywordsSheet = sheetNames.find((n) => n.toLowerCase() === 'keywords')

  if (!topicsSheet) {
    throw new Error('XLSX must contain a "Topics" tab')
  }

  // Parse Topics tab
  const topicsData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[topicsSheet],
  )

  const topics: TopicInput[] = topicsData.map((row) => ({
    title: String(row.Title ?? row.title ?? '').trim(),
    target_audience: row.Target_Audience
      ? String(row.Target_Audience).trim()
      : row.target_audience
        ? String(row.target_audience).trim()
        : undefined,
    angle: row.Angle ? String(row.Angle).trim() : row.angle ? String(row.angle).trim() : undefined,
    existing_url: row.Existing_URL
      ? String(row.Existing_URL).trim()
      : row.existing_url
        ? String(row.existing_url).trim()
        : undefined,
    brand_context: row.Brand_Context
      ? String(row.Brand_Context).trim()
      : row.brand_context
        ? String(row.brand_context).trim()
        : undefined,
    seed_keywords: [],
  })).filter((t) => t.title)

  if (!keywordsSheet || !topics.length) return topics

  // Parse Keywords tab
  const keywordsData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[keywordsSheet],
  )

  // Build topic lookup
  const topicsByTitle = new Map<string, TopicInput>()
  for (const t of topics) {
    topicsByTitle.set(t.title.toLowerCase(), t)
  }

  // Match keywords to topics
  for (const row of keywordsData) {
    const topicName = String(row.topic ?? row.Topic ?? '').trim()
    const keyword = String(row.keyword ?? row.Keyword ?? '').trim()
    if (!topicName || !keyword) continue

    // Try exact match first
    let matched = topicsByTitle.get(topicName.toLowerCase())

    // Fall back to fuzzy matching
    if (!matched) {
      for (const t of topics) {
        if (fuzzyTopicMatch(topicName, t.title)) {
          matched = t
          break
        }
      }
    }

    if (!matched) continue

    const seedKw: SeedKeyword = {
      keyword,
      keyword_type: (String(row.keyword_type ?? row.Keyword_Type ?? 'secondary').trim() as SeedKeyword['keyword_type']),
      volume: Number(row.volume ?? row.Volume ?? 0) || 0,
      cpc: Number(row.cpc ?? row.CPC ?? 0) || 0,
      competition: Number(row.competition ?? row.Competition ?? 0) || 0,
      metrics_source: String(row.metrics_source ?? '').trim(),
    }

    matched.seed_keywords.push(seedKw)

    // Copy spreadsheet metadata to topic if present
    if (row.pillar && !matched.pillar) matched.pillar = String(row.pillar).trim()
    if (row.funnel_stage && !matched.funnel_stage) matched.funnel_stage = String(row.funnel_stage).trim()
    if (row.primary_intent && !matched.primary_intent) matched.primary_intent = String(row.primary_intent).trim()
    if (row.summary && !matched.summary) matched.summary = String(row.summary).trim()
    if (row.differentiation_angle && !matched.differentiation_angle) matched.differentiation_angle = String(row.differentiation_angle).trim()
    if (row.internal_linking && !matched.internal_linking) matched.internal_linking = String(row.internal_linking).trim()
    if (row.geo_notes && !matched.geo_notes) matched.geo_notes = String(row.geo_notes).trim()
  }

  return topics
}
