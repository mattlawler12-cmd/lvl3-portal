-- ============================================================
-- Migration 4: Fix recursive RLS on public.users (and all tables)
--
-- Root cause: all admin policies used
--   EXISTS (SELECT 1 FROM public.users WHERE role = 'admin')
-- which causes infinite recursion when Postgres evaluates RLS
-- on public.users itself, returning null and breaking role checks.
--
-- Fix: introduce a SECURITY DEFINER function get_my_role() that
-- reads the caller's role while bypassing RLS, then use it in
-- all admin policies.
-- ============================================================

-- Step 1: Security definer function — reads caller's role without
-- triggering RLS (SECURITY DEFINER runs as the function owner).
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ── users ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_all_users" ON public.users;

CREATE POLICY "admins_all_users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ── clients ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_all_clients" ON public.clients;

CREATE POLICY "admins_all_clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ── deliverables ─────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_all_deliverables" ON public.deliverables;

CREATE POLICY "admins_all_deliverables"
  ON public.deliverables
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ── comments ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_all_comments" ON public.comments;

CREATE POLICY "admins_all_comments"
  ON public.comments
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ── posts ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_all_posts" ON public.posts;

CREATE POLICY "admins_all_posts"
  ON public.posts
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ── services ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_all_services" ON public.services;

CREATE POLICY "admins_all_services"
  ON public.services
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
