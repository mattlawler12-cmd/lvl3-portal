# LVL3 Portal — CLAUDE.md

Internal client portal for LVL3 digital marketing agency. Admins manage clients, view analytics, deliver work, and run SEO tools. Clients log in to view deliverables, a project tracker, and their dashboard.

Deployed at: **https://lvl3-portal.vercel.app**
Repo: **https://github.com/mattlawler12-cmd/lvl3-portal**

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Auth + DB | Supabase (Postgres + RLS + Storage) |
| Styling | Tailwind CSS v3 + CSS variables |
| Icons | lucide-react |
| Charts | Recharts v2 |
| AI | Anthropic SDK (`claude-sonnet-4-6`) |
| Google APIs | `googleapis` npm package |
| Deployment | Vercel (prod auto-alias: lvl3-portal.vercel.app) |

No ORM. All DB queries are raw Supabase client calls.

---

## Environment Variables

These must be set in `.env.local` (dev) and Vercel dashboard (prod):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_CLIENT_ID=          # OAuth2 for GA4 + GSC admin connection
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=

GOOGLE_SERVICE_ACCOUNT_KEY=  # JSON string — used for Google Sheets ONLY
ANTHROPIC_API_KEY=
```

---

## User Roles

Three roles, enforced server-side in every page via `lib/auth.ts`:

| Role | Access |
|------|--------|
| `admin` | Everything. All pages, all clients, settings, tools |
| `member` | Same as admin except `/admin` page and client settings |
| `client` | Their assigned client only — deliverables, projects, dashboard, insights |

```typescript
// lib/auth.ts
await requireAuth()   // any logged-in user
await requireAdmin()  // admin only, redirects to / if not
```

---

## Auth Architecture

- **Supabase Auth** handles login sessions (email/password).
- Middleware (`middleware.ts`) refreshes sessions and redirects unauthenticated users to `/login`. It does NOT enforce roles — pages handle that.
- User profile lives in `public.users` table (id, email, role, client_id).
- `client_id` on the users row only matters for `client` role users — it pins them to one client.

---

## Google API Auth — Two Separate Systems

### 1. Admin OAuth2 — used for GA4 + GSC + GSC Tools
The admin connects their Google account once via `/admin` → `GoogleConnectionPanel`. The token is stored in the `admin_google_token` table (single row, id=1).

```typescript
// lib/google-auth.ts — NO 'use server'
const auth = await getAdminOAuthClient()
// Returns an OAuth2 client with auto-refresh. Reads cookies via createServiceClient.
// CANNOT be called inside unstable_cache — it reads cookies.
```

Used in:
- `lib/google-analytics.ts` — `fetchGA4Metrics`, `fetchGA4Report`
- `lib/google-search-console.ts` — `listGSCSites`, `fetchGSCMetrics`, `fetchGSCReport`
- `lib/tools-gsc.ts` — `fetchGSCRows` (raw query+page rows, up to 25k)
- `app/actions/analytics.ts` — `detectGSCSiteUrl`, `listGA4Properties`, `listGSCSiteOptions`

### 2. Service Account — used for Google Sheets ONLY
Key stored as JSON string in `GOOGLE_SERVICE_ACCOUNT_KEY` env var.

```typescript
// lib/google-sheets.ts — NO 'use server'
// getCredentials() reads GOOGLE_SERVICE_ACCOUNT_KEY
// getAuthAndSheets() creates GoogleAuth with spreadsheets.readonly scope
```

Used in:
- `lib/google-sheets.ts` — `fetchSheetRows`, `fetchSheetHeaders`
- `app/actions/projects.ts` — `getSheetData` calls `fetchSheetRows`

**IMPORTANT:** Do NOT add `unstable_cache` around anything that calls `getAdminOAuthClient()` — it reads cookies and will throw inside a cache scope.

---

## Supabase Clients

Two clients, always use the right one:

```typescript
// Server components and server actions — user session (respects RLS)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Service operations — bypasses RLS (use for cross-client queries, admin ops)
import { createServiceClient } from '@/lib/supabase/server'
const service = await createServiceClient()
```

---

## Client Selection Pattern

Admins/members pick a client via a dropdown in the TopBar. The selection is stored in a cookie (`selected_client`). Client-role users are always pinned to their `client_id`.

Every page that needs the active client does:

```typescript
const { user } = await requireAuth()          // or requireAdmin()
const selectedClientId = await resolveSelectedClientId(user)
const client = selectedClientId
  ? await getClientById<{ id: string; name: string }>(selectedClientId, 'id, name')
  : null
```

Helper functions: `lib/client-resolution.ts`
- `resolveSelectedClientId(user)` — returns client_id for client role, cookie value for admin/member
- `getClientById<T>(id, columns)` — typed fetch of a single client
- `getClientListForUser(userId, role, clientId)` — used by layout to populate dropdown

---

## Database Schema (key tables)

```sql
clients
  id uuid PK
  name text
  slug text UNIQUE
  logo_url text
  hero_image_url text
  google_sheet_id text        -- Google Sheets ID or URL
  sheet_header_row int        -- which row has column headers (default 1)
  sheet_column_map jsonb      -- { month, category, task, status, fee, note } → column header names
  looker_embed_url text
  ga4_property_id text        -- numeric property ID (not "properties/XXX")
  gsc_site_url text           -- e.g. "https://example.com/" or "sc-domain:example.com"
  analytics_summary text      -- AI-generated narrative (updated by generateAnalyticsInsights)
  analytics_summary_updated_at timestamptz
  snapshot_insights jsonb     -- { takeaways, anomalies, opportunities }
  ai_summary text             -- project AI summary (updated by generateClientSummary)

users
  id uuid PK (= auth.users.id)
  email text
  role text  ('admin' | 'member' | 'client')
  client_id uuid FK → clients  (null for admin/member)

deliverables
  id, client_id, title, type, status, file_url, created_at, updated_at, is_read

comments
  id, deliverable_id, user_id, body, resolved, created_at

admin_google_token          -- single row (id=1)
  id int PK CHECK (id = 1)
  access_token text
  refresh_token text
  expiry_date bigint
  email text

user_client_access          -- member ↔ client many-to-many
  user_id, client_id
```

---

## App Routes

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
/ask-lvl3                 → Claude-powered chat with client analytics context
/clients                  → Client list (admin only)
/clients/[id]             → Client detail + settings form merged (admin only)
/clients/[id]/settings    → Redirects to /clients/[id]
/admin                    → Admin health overview + Google OAuth connect panel
/login                    → Auth page
/auth/callback            → Supabase OAuth callback
/auth/google-callback     → Google OAuth callback (stores token in admin_google_token)
```

---

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

---

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

---

## Dashboard Date Range System

Dashboard period and comparison are URL params: `?period=28d&compare=prior&tab=website`

- Period pills: `7D | 28D | 3M | 6M | 12M` → `7d | 28d | 90d | 180d | 365d`
- Compare: `prior` (preceding equal window) or `yoy` (same window 365 days back)
- Server page reads params → calls `fetchAnalyticsData` + `fetchDashboardReport` with a `DateRange` object
- `DashboardTabs.tsx` is a `'use client'` component using `useSearchParams` + `useRouter` to update URL

---

## Design System

**Dark warm theme** — body background #1a1408 (ink), cards #252010, primary text #fdf6e3 (cream).

### Key CSS variables
```css
--background: #1a1408        /* body */
--foreground: #fdf6e3        /* primary text */
--color-card: #252010        /* card bg */
--color-marigold: #FEC77C    /* main accent — buttons, active states, KPI numbers */
--color-gold-deep: #B07E09   /* eyebrow labels, deep accent */
--color-muted: #c4ae84       /* secondary text */
--color-border: #e0c878      /* borders */

/* Topbar (cream) */
--nav-bg: #fdf6e3
--nav-text: #7A6540

/* Sidebar (dark) */
--sidebar-bg: #1a1408
--sidebar-active: #FEC77C
```

### Tailwind color tokens
- `surface-950/900/850/800` — backgrounds (darkest → card)
- `surface-700/600` — borders
- `surface-500/400/300/200/100` — text (muted → primary cream)
- `brand-400` — marigold (#FEC77C) — primary accent
- `brand-700` — deep gold (#B07E09)

### Typography
- Body: DM Sans (`var(--font-dm-sans)`)
- Headings (h1-h6): Playfair Display (`var(--font-playfair)`) — bold serif
- Eyebrow labels: `.eyebrow` utility class — 11px, 500 weight, 0.14em tracking, uppercase, `--color-gold-deep`

### Component conventions
- Cards: `bg-surface-900 border border-surface-700 rounded-xl`
- Input fields: `bg-surface-800 border border-surface-600 text-surface-100 rounded-lg px-3 py-2`
- KPI numbers: `style={{ color: 'var(--color-marigold)' }}`
- Primary buttons: `bg-blue-600 hover:bg-blue-500 text-surface-100`
- Section headings in cards: `text-surface-100 font-semibold text-sm uppercase tracking-wide`

---

## Navigation

**TopBar** (`components/nav/TopBar.tsx`) — cream bar, 56px tall, contains:
- LVL3 logo/wordmark
- Client selector dropdown (admin/member only, sets `selected_client` cookie)
- Notifications bell
- User avatar/menu

**Sidebar** (`components/sidebar.tsx`) — dark, collapsible, desktop only. Mobile uses bottom nav.

Nav items in order:
1. Home `/`
2. Projects `/projects`
3. Dashboard `/dashboard`
4. Deliverables `/deliverables`
5. Insights `/insights`
6. Services `/services`
7. Tools `/tools` ← admin-only pages
8. Ask LVL3 `/ask-lvl3` ← admin-only pages
9. Clients `/clients` (isAdmin spread)
10. Admin `/admin` (isAdmin spread)

To add a nav item: edit `components/sidebar.tsx` only — add the icon import and a new entry in the `navItems` array.

---

## Ask LVL3 Chat

`/ask-lvl3` — Claude-powered chat with client-specific context.

Context injected into system prompt:
1. Client name
2. `analytics_summary` (stored narrative from last insight refresh)
3. `snapshot_insights` (takeaways, anomalies, opportunities)
4. **Live GSC data** — triggered if message contains: keyword, ranking, query, search, position, impression, click, page, url, trending, organic, traffic, gsc, search console → fetches 90 days of query+page rows, pushes top queries + top pages by clicks
5. **Live GA4 landing page data** — triggered if message contains: page, session, traffic, landing, trending, organic, ga4, analytics → calls `fetchGA4Report`, pushes top organic landing pages with session deltas

Model: `claude-sonnet-4-6`, max_tokens: 1024.

---

## SEO Tools

All tools are admin-only, require a client selected in the top bar, and call `fetchGSCRows` (90-day window, up to 25k rows via admin OAuth).

| Tool | Logic |
|------|-------|
| Keyword Quick Wins | Position 4–20, 100+ impressions. Opportunity score = (est clicks at #3 − actual clicks) × (1/position) × 100 |
| AI Visibility Check | Branded vs non-branded split. Brand terms = client name + slug + domain hostname prefix |
| Content Gap Finder | Three gap types: high-impression-no-clicks (200+ imp, <1% CTR, pos ≤30), near-page-one (pos 11-20, 150+ imp), ranking-but-weak (pos ≤10, CTR below position benchmark) |

---

## Key Conventions & Rules

1. **Always read files before editing them.**
2. **`'use server'`** only in `app/actions/*.ts`. Never in `lib/`.
3. **No `unstable_cache`** around anything that calls `getAdminOAuthClient()` — it reads cookies.
4. **Service account** (`GOOGLE_SERVICE_ACCOUNT_KEY`) is Sheets only. **OAuth** is GA4 + GSC.
5. **`createServiceClient()`** for admin/cross-client DB ops. **`createClient()`** for user-scoped ops.
6. **TypeScript** — run `npx tsc --noEmit` after every set of changes. Fix all errors before stopping.
7. **No new packages** without explicit request.
8. **No database migrations** without explicit request.
9. **Deployment**: `vercel --prod` then `git push`. Both are always needed.
10. **`/clients/[id]/settings`** redirects to `/clients/[id]` — settings form is embedded on the detail page.
11. **Map iteration** — use `Array.from(map.entries())` not `for...of map.entries()` directly (TS target constraint).
12. **`params` and `searchParams`** in Next.js 14 App Router are Promises — always `await` them.

---

## Common Patterns

### Admin-only page
```typescript
export default async function MyPage() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)
  const client = selectedClientId
    ? await getClientById<{ id: string; name: string }>(selectedClientId, 'id, name')
    : null
  // ...
}
```

### Server action
```typescript
'use server'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function myAction(clientId: string): Promise<{ data?: Foo; error?: string }> {
  try {
    await requireAdmin()
    const service = await createServiceClient()
    // ...
    return { data }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed' }
  }
}
```

### GA4 fetch (admin OAuth)
```typescript
import { fetchGA4Report } from '@/lib/google-analytics'
const report = await fetchGA4Report(propertyId) // uses getAdminOAuthClient()
```

### GSC raw rows (tools)
```typescript
import { fetchGSCRows } from '@/lib/tools-gsc'
const rows = await fetchGSCRows(siteUrl, 90) // returns GSCRow[] up to 25k
```

### Sheet data (service account)
```typescript
import { fetchSheetRows } from '@/lib/google-sheets'
const rows = await fetchSheetRows(sheetId, headerRow, columnMap)
```
