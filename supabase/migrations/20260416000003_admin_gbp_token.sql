-- Separate OAuth token for Google Business Profile access.
-- GBP is often managed from a different Google account than Analytics/GSC.

create table if not exists admin_gbp_token (
  id           int          primary key check (id = 1),
  access_token text         not null,
  refresh_token text        not null,
  expiry_date  bigint       not null,
  email        text,
  updated_at   timestamptz  not null default now()
);
