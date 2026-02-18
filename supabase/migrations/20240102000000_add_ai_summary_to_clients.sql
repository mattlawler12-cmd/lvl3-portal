ALTER TABLE public.clients
  ADD COLUMN ai_summary TEXT,
  ADD COLUMN ai_summary_updated_at TIMESTAMPTZ;
