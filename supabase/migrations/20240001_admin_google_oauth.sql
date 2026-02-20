create table if not exists admin_google_token (
  id            integer primary key default 1 check (id = 1),
  access_token  text not null,
  refresh_token text not null,
  expiry_date   bigint not null,
  email         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
