# SEO Content Engine

NDJSON streaming pipeline for batch SEO content generation. PARALLEL_TOPIC_LIMIT=10, all LLM stages use `claude-sonnet-4-6`.

## Pipeline Phases
Keywords → Brief → Draft → Review → Revision → DOCX generation

## Key Files
- `app/api/seo-content-engine/route.ts` — Streaming NDJSON endpoint (the pipeline)
- `SeoContentEngineClient.tsx` — Main client component (this directory)
- `app/actions/seo-content-engine.ts` — Server actions: listRuns, loadRun, getDocxUrl, deleteRun, regenerateDocx, exportMatrixifyCsv
- `lib/seo-content-engine/docx-writer.ts` — DOCX generation using `docx` npm package
- `lib/seo-content-engine/types.ts` — TypeScript types (TopicInput, KeywordPlan, ContentBrief, DraftReview)
- `lib/seo-content-engine/utils.ts` — slugify() and helpers
- `lib/seo-content-engine/config.ts` — MODES config

## Critical DB Quirk
Keyword entries in DB JSON blobs are stored as **objects** `{keyword, cpc, msv, reason, competition}` not strings. All display components and docx-writer use `toStr()`/`toStrArray()` coercion helpers. Affected files: KeywordPlanView.tsx, BriefPreview.tsx, docx-writer.ts.

## Storage
- Supabase bucket: `client-assets` (DOCX MIME type allowed, 20MB limit)
- Path pattern: `{client_id}/seo-content/{run_id}/{slug}.docx`
- Signed URLs via `getDocxUrl()` (1hr expiry)

## Installed Packages
- `jszip` — ZIP file creation for batch download
- `xlsx` — Spreadsheet generation
- `docx` — Word document generation
