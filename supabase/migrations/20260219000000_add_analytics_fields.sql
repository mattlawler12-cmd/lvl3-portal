ALTER TABLE public.clients
  ADD COLUMN sheet_header_row  SMALLINT DEFAULT 1,
  ADD COLUMN sheet_column_map  JSONB,
  ADD COLUMN ga4_property_id   TEXT,
  ADD COLUMN gsc_site_url      TEXT,
  ADD COLUMN analytics_summary TEXT,
  ADD COLUMN analytics_summary_updated_at TIMESTAMPTZ;
