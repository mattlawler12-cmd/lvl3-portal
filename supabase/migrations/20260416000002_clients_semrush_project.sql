-- Add semrush_project_id to clients table.
-- Used by the Semrush Site Audit API wrapper to auto-create and reuse audit projects per client domain.

alter table clients
  add column if not exists semrush_project_id text;

comment on column clients.semrush_project_id is
  'Semrush Site Audit project ID, auto-created on first crawl and reused for subsequent audits.';
