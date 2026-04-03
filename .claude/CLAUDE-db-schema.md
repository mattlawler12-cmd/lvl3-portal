# Database Schema (key tables)

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

ask_lvl3_conversations      -- chat threads per client
  id uuid PK, client_id FK, title, created_at, updated_at

ask_lvl3_messages           -- messages within a thread
  id uuid PK, conversation_id FK, role, content, created_at

semrush_reports             -- persisted gap analysis results
  id uuid PK, client_id FK, client_domain, competitors, database,
  page_section, filters, keywords jsonb, client_keyword_count, keyword_count, created_at
```
