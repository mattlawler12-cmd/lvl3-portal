-- ============================================================
-- Migration 1 of 3: Enums, tables, triggers
-- All CREATE TABLE and ALTER TABLE statements are here.
-- No CREATE POLICY statements — those come in migration 2.
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE public.user_role AS ENUM ('admin', 'client');
CREATE TYPE public.file_type AS ENUM ('pdf', 'slides', 'sheets', 'link');

-- ── Tables (in FK dependency order) ─────────────────────────

-- clients has no portal-table dependencies
CREATE TABLE IF NOT EXISTS public.clients (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  logo_url     TEXT,
  slug         TEXT        UNIQUE NOT NULL,
  google_sheet_id  TEXT,
  looker_embed_url TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- users references auth.users and clients
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID             PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT             NOT NULL,
  role       public.user_role NOT NULL DEFAULT 'client',
  client_id  UUID             REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- deliverables references clients
CREATE TABLE IF NOT EXISTS public.deliverables (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID              NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title       TEXT              NOT NULL,
  file_url    TEXT,
  file_type   public.file_type  NOT NULL,
  viewed_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- comments references deliverables and users (and itself for threading)
CREATE TABLE IF NOT EXISTS public.comments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id  UUID        NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body            TEXT        NOT NULL,
  parent_id       UUID        REFERENCES public.comments(id) ON DELETE CASCADE,
  resolved        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- posts references clients (nullable)
CREATE TABLE IF NOT EXISTS public.posts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  body             TEXT        NOT NULL,
  category         TEXT        NOT NULL,
  target_client_id UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- services has no FK dependencies
CREATE TABLE IF NOT EXISTS public.services (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  cta_url           TEXT,
  target_client_ids UUID[]      NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Enable RLS on every table ────────────────────────────────

ALTER TABLE public.clients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services    ENABLE ROW LEVEL SECURITY;

-- ── Auto-create user profile on signup ──────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- ON CONFLICT DO NOTHING: safe if a public.users row already exists
  -- (e.g. the admin user was inserted manually before this trigger ran).
  -- The existing row — including any manually set role — is left untouched.
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
