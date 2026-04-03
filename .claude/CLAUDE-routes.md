# App Routes

```
/                        → Home (client summary, engagement strip, nav cards)
/dashboard               → GA4 + GSC tabs + Looker embed (period/compare via URL params)
/projects                → Google Sheet task tracker
/deliverables            → Deliverable cards with comments
/insights                → Blog/insights posts
/services                → Services page (redirect stub)
/tools                   → SEO tools hub (admin only)
/tools/keyword-quick-wins → GSC positions 4-20 opportunity table
/tools/ai-visibility      → Branded vs non-branded search share
/tools/content-gaps       → High-impression low-CTR query finder
/tools/semrush-gap        → Semrush competitor keyword gap analysis
/tools/blog-image-generator → Batch AI blog image generation (OpenAI DALL-E)
/ask-lvl3                 → Claude-powered chat with client analytics context
/clients                  → Client list (admin only)
/clients/[id]             → Client detail + settings form merged (admin only)
/clients/[id]/settings    → Redirects to /clients/[id]
/admin                    → Admin health overview + Google OAuth connect panel
/login                    → Auth page
/auth/callback            → Supabase OAuth callback
/auth/google-callback     → Google OAuth callback (stores token in admin_google_token)
```

## Route Handlers (`app/api/`)

| Route | Purpose |
|-------|---------|
| `app/api/ask-lvl3/route.ts` | Streaming NDJSON endpoint for Ask LVL3 chat. Agentic loop with Claude tool_use (GSC/GA4 queries). Manual auth check (no `requireAdmin()` — it uses `redirect()` which throws inside ReadableStream). |
| `app/api/generate-blog-images/route.ts` | Batch blog image generation via OpenAI DALL-E + sharp for resizing. Uploads to Supabase Storage. `maxDuration = 300`. |

Route Handlers do NOT use `'use server'`. They use manual auth via `supabase.auth.getUser()` + profile role check.

## Server Actions (`app/actions/`)

All files must have `'use server'` at the top. No `'use server'` in `lib/` files.

| File | Key exports |
|------|-------------|
| `analytics.ts` | `fetchAnalyticsData`, `fetchDashboardReport`, `detectGSCSiteUrl`, `listGA4Properties`, `listGSCSiteOptions`, `generateAnalyticsInsights`, `fetchLogoUrl`, `getSheetHeadersAction` |
| `tools.ts` | `fetchQuickWins`, `checkAIVisibility`, `fetchContentGaps` |
| `ask-lvl3.ts` | `sendChatMessage` (injects GSC + GA4 context dynamically) |
| `clients.ts` | `getClientsWithStats`, `updateClient`, `getClientUsers`, `inviteUser`, `removeUser` |
| `projects.ts` | `getSheetData`, `syncSheet` |
| `admin-google.ts` | `getAdminGoogleStatus`, `connectAdminGoogle`, `disconnectAdminGoogle` |
| `client-selection.ts` | `setSelectedClient` (sets the `selected_client` cookie) |
| `summaries.ts` | `generateClientSummary` (AI project summary) |
| `deliverables.ts` | CRUD + comment actions |
| `ask-lvl3-conversations.ts` | `listConversations`, `loadConversation`, `deleteConversation` — thread persistence |
| `semrush-reports.ts` | `listSemrushReports`, `loadSemrushReport`, `saveSemrushReport` — gap analysis persistence |

## Lib Files (`lib/`)

No `'use server'` in any lib file — they are plain async functions.

| File | Purpose |
|------|---------|
| `auth.ts` | `requireAuth()`, `requireAdmin()` |
| `client-resolution.ts` | `resolveSelectedClientId`, `getClientById`, `getClientListForUser` |
| `google-auth.ts` | `getAdminOAuthClient()` — OAuth2 client from DB token |
| `google-analytics.ts` | `fetchGA4Metrics`, `fetchGA4Report` — uses admin OAuth |
| `google-search-console.ts` | `fetchGSCMetrics`, `fetchGSCReport`, `listGSCSites` — uses admin OAuth |
| `google-sheets.ts` | `fetchSheetRows`, `fetchSheetHeaders`, `parseSheetId` — uses service account |
| `tools-gsc.ts` | `fetchGSCRows` — raw 25k-row GSC dump for tools + Ask LVL3 |
| `date-range.ts` | `buildDateRange(period, compare)` — periods: 7d/28d/90d/180d/365d, compare: prior/yoy |
| `queries.ts` | Shared Supabase query helpers |
| `ask-tools.ts` | `gscQuery` — flexible GSC search analytics query used by Ask LVL3 agentic tools |
