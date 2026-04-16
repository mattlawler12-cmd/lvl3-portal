-- Tool runs: persists every tool execution with its input, output, and artifact path.
-- Used by the History tab on each persistent tool.

create table if not exists tool_runs (
  id             uuid        primary key default gen_random_uuid(),
  tool_slug      text        not null,
  client_id      uuid        references clients(id) on delete cascade,
  user_id        uuid        references auth.users(id) on delete set null,
  input          jsonb       not null default '{}',
  output         jsonb,
  artifact_path  text,
  status         text        not null default 'queued'
                             check (status in ('queued','running','complete','partial','failed')),
  error          text,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now()
);

-- Efficient lookups by tool + client (most common query pattern)
create index if not exists idx_tool_runs_scope
  on tool_runs(tool_slug, client_id, created_at desc);

-- User-scoped history lookup
create index if not exists idx_tool_runs_user
  on tool_runs(user_id, created_at desc);

-- RLS: enable and add policies
alter table tool_runs enable row level security;

-- Admins see all runs
create policy "Admins can view all tool runs"
  on tool_runs for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Members see runs they created or runs for their assigned client
create policy "Members can view own and client runs"
  on tool_runs for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from users
      where users.id = auth.uid()
      and users.client_id = tool_runs.client_id
    )
  );

-- Any authenticated user can insert (server validates via service client)
create policy "Authenticated users can insert tool runs"
  on tool_runs for insert
  with check (auth.uid() is not null);

-- Users can update their own runs (for status updates from API routes)
create policy "Users can update own tool runs"
  on tool_runs for update
  using (user_id = auth.uid() or exists (
    select 1 from users where users.id = auth.uid() and users.role = 'admin'
  ));
