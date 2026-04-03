# Google API Auth — Two Separate Systems

## 1. Admin OAuth2 — used for GA4 + GSC + GSC Tools
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

## 2. Service Account — used for Google Sheets ONLY
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
