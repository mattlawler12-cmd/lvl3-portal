CREATE TABLE public.semrush_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_domain       TEXT NOT NULL,
  competitors         TEXT[] NOT NULL,
  database            TEXT NOT NULL DEFAULT 'us',
  page_section        TEXT NOT NULL DEFAULT 'all',
  filters             JSONB NOT NULL DEFAULT '{}',
  matrix_data         JSONB NOT NULL,
  relevance_scores    JSONB,
  client_keyword_count INT NOT NULL DEFAULT 0,
  keyword_count       INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.semrush_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_members_semrush_reports"
  ON public.semrush_reports FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('admin','member')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('admin','member')
  ));

CREATE INDEX idx_semrush_reports_client ON public.semrush_reports (client_id, created_at DESC);
