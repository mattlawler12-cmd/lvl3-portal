# SEO Tools & Ask LVL3

## SEO Tools

All tools are admin-only, require a client selected in the top bar, and call `fetchGSCRows` (90-day window, up to 25k rows via admin OAuth).

| Tool | Logic |
|------|-------|
| Keyword Quick Wins | Position 4–20, 100+ impressions. Opportunity score = (est clicks at #3 − actual clicks) × (1/position) × 100 |
| AI Visibility Check | Branded vs non-branded split. Brand terms = client name + slug + domain hostname prefix |
| Content Gap Finder | Three gap types: high-impression-no-clicks (200+ imp, <1% CTR, pos ≤30), near-page-one (pos 11-20, 150+ imp), ranking-but-weak (pos ≤10, CTR below position benchmark) |
| Semrush Gap Analysis | Competitor keyword gap analysis via Semrush API. Matrix view, pre-filters, relevance scoring. Reports persisted in `semrush_reports` table. |
| Blog Image Generator | Batch DALL-E image generation from CSV input. Uses OpenAI API (`OPENAI_API_KEY`) + sharp for resizing. Uploads to Supabase Storage. |

## Ask LVL3 Chat

`/ask-lvl3` — Claude-powered agentic chat with client-specific context.

**Architecture:** Streaming NDJSON via Route Handler (`app/api/ask-lvl3/route.ts`). Agentic loop — Claude can call tools (`get_gsc_data`, `get_ga4_data`) autonomously, iterating until it has enough data to answer. Text deltas are suppressed during tool_use iterations; status events (`{ type: 'status', text: '...' }`) are emitted instead.

**Persistence:** Conversations stored in `ask_lvl3_conversations` + `ask_lvl3_messages` tables. Thread picker UI with select dropdown + delete.

Context injected into system prompt:
1. Client name
2. `analytics_summary` (stored narrative from last insight refresh)
3. `snapshot_insights` (takeaways, anomalies, opportunities)

Model: `claude-sonnet-4-6`, max_tokens: 1024.

## Dashboard Date Range System

Dashboard period and comparison are URL params: `?period=28d&compare=prior&tab=website`

- Period pills: `7D | 28D | 3M | 6M | 12M` → `7d | 28d | 90d | 180d | 365d`
- Compare: `prior` (preceding equal window) or `yoy` (same window 365 days back)
- Server page reads params → calls `fetchAnalyticsData` + `fetchDashboardReport` with a `DateRange` object
- `DashboardTabs.tsx` is a `'use client'` component using `useSearchParams` + `useRouter` to update URL
