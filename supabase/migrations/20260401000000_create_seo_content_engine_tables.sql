-- SEO Content Engine tables
-- Stores pipeline runs (one per batch) and topics (one per article within a run)

-- ── Runs table ─────────────────────────────────────────────────
CREATE TABLE seo_content_engine_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('keywords_only', 'brief', 'full')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed', 'partial')),
  brand_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  topic_count INT NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0
);

-- ── Topics table ───────────────────────────────────────────────
CREATE TABLE seo_content_engine_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES seo_content_engine_runs(id) ON DELETE CASCADE,

  -- Input fields
  title TEXT NOT NULL,
  target_audience TEXT,
  angle TEXT,
  existing_url TEXT,
  pillar TEXT,
  funnel_stage TEXT,
  primary_intent TEXT,
  summary TEXT,
  differentiation_angle TEXT,
  internal_linking TEXT,
  geo_notes TEXT,
  seed_keywords JSONB DEFAULT '[]'::jsonb,

  -- Pipeline outputs
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed', 'partial')),
  keyword_plan JSONB,
  brief JSONB,
  draft TEXT,
  draft_review JSONB,
  revised_draft TEXT,
  warnings TEXT[] DEFAULT '{}',
  word_count INT,
  error TEXT,

  -- Data availability tracking (which APIs succeeded/failed)
  data_availability JSONB DEFAULT '{}'::jsonb,

  -- File outputs
  docx_storage_path TEXT,
  brief_json_storage_path TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX idx_sce_runs_client ON seo_content_engine_runs(client_id);
CREATE INDEX idx_sce_runs_status ON seo_content_engine_runs(status);
CREATE INDEX idx_sce_topics_run ON seo_content_engine_topics(run_id);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE seo_content_engine_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_engine_topics ENABLE ROW LEVEL SECURITY;

-- Admin and member roles can manage all rows
CREATE POLICY "Admin/member manage runs"
  ON seo_content_engine_runs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Admin/member manage topics"
  ON seo_content_engine_topics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'member')
    )
  );
