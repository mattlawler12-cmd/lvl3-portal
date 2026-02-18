-- ============================================================
-- Migration 5b: user_client_access table + updated RLS
--
-- Depends on migration 5a (ALTER TYPE ... ADD VALUE 'member')
-- having been committed first.
--
-- 'member' = internal LVL3 staff who can be granted access to
-- one or more client workspaces (read-only, same view as client).
-- 'client' role continues to use users.client_id (unchanged).
-- ============================================================

-- ── 1. Join table: members ↔ clients (many-to-many) ──────────

CREATE TABLE IF NOT EXISTS public.user_client_access (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id  UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

ALTER TABLE public.user_client_access ENABLE ROW LEVEL SECURITY;

-- Admins can manage all access grants
CREATE POLICY "admins_all_user_client_access"
  ON public.user_client_access
  FOR ALL
  TO authenticated
  USING  (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Members can see which clients they have access to
CREATE POLICY "members_select_own_access"
  ON public.user_client_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── 2. Update handle_new_user trigger to read invite metadata ─
--
-- When inviteUserByEmail is called with:
--   data: { role: 'client', client_id: '<uuid>' }
-- the trigger reads raw_user_meta_data to set role + client_id
-- on the new public.users row instead of defaulting to 'client'/null.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, client_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'client'
    ),
    (NEW.raw_user_meta_data->>'client_id')::uuid
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 3. Update client/member SELECT policies on all tables ─────
--
-- New pattern covers both roles:
--   client → uses users.client_id (unchanged, backward compatible)
--   member → uses user_client_access join table

-- clients table
DROP POLICY IF EXISTS "clients_select_own" ON public.clients;
CREATE POLICY "clients_select_own"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    (
      get_my_role() = 'client'
      AND id = (SELECT client_id FROM public.users WHERE id = auth.uid())
    )
    OR
    (
      get_my_role() = 'member'
      AND EXISTS (
        SELECT 1 FROM public.user_client_access uca
        WHERE uca.user_id = auth.uid() AND uca.client_id = clients.id
      )
    )
  );

-- deliverables table
DROP POLICY IF EXISTS "clients_select_own_deliverables" ON public.deliverables;
CREATE POLICY "clients_select_own_deliverables"
  ON public.deliverables
  FOR SELECT
  TO authenticated
  USING (
    (
      get_my_role() = 'client'
      AND client_id = (SELECT u.client_id FROM public.users u WHERE u.id = auth.uid())
    )
    OR
    (
      get_my_role() = 'member'
      AND EXISTS (
        SELECT 1 FROM public.user_client_access uca
        WHERE uca.user_id = auth.uid() AND uca.client_id = deliverables.client_id
      )
    )
  );

-- comments table — SELECT
DROP POLICY IF EXISTS "clients_select_own_comments" ON public.comments;
CREATE POLICY "clients_select_own_comments"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    deliverable_id IN (
      SELECT d.id FROM public.deliverables d
      WHERE
        (
          get_my_role() = 'client'
          AND d.client_id = (SELECT u.client_id FROM public.users u WHERE u.id = auth.uid())
        )
        OR
        (
          get_my_role() = 'member'
          AND EXISTS (
            SELECT 1 FROM public.user_client_access uca
            WHERE uca.user_id = auth.uid() AND uca.client_id = d.client_id
          )
        )
    )
  );

-- comments table — INSERT (members can also post comments)
DROP POLICY IF EXISTS "clients_insert_own_comments" ON public.comments;
CREATE POLICY "clients_insert_own_comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND deliverable_id IN (
      SELECT d.id FROM public.deliverables d
      WHERE
        (
          get_my_role() = 'client'
          AND d.client_id = (SELECT u.client_id FROM public.users u WHERE u.id = auth.uid())
        )
        OR
        (
          get_my_role() = 'member'
          AND EXISTS (
            SELECT 1 FROM public.user_client_access uca
            WHERE uca.user_id = auth.uid() AND uca.client_id = d.client_id
          )
        )
    )
  );

-- posts table
DROP POLICY IF EXISTS "clients_select_own_posts" ON public.posts;
CREATE POLICY "clients_select_own_posts"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    target_client_id IS NULL
    OR
    (
      get_my_role() = 'client'
      AND target_client_id = (SELECT u.client_id FROM public.users u WHERE u.id = auth.uid())
    )
    OR
    (
      get_my_role() = 'member'
      AND EXISTS (
        SELECT 1 FROM public.user_client_access uca
        WHERE uca.user_id = auth.uid() AND uca.client_id = posts.target_client_id
      )
    )
  );

-- services table
DROP POLICY IF EXISTS "clients_select_own_services" ON public.services;
CREATE POLICY "clients_select_own_services"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (
    array_length(target_client_ids, 1) IS NULL
    OR
    (
      get_my_role() = 'client'
      AND (SELECT u.client_id FROM public.users u WHERE u.id = auth.uid()) = ANY(target_client_ids)
    )
    OR
    (
      get_my_role() = 'member'
      AND EXISTS (
        SELECT 1 FROM public.user_client_access uca
        WHERE uca.user_id = auth.uid() AND uca.client_id = ANY(services.target_client_ids)
      )
    )
  );
