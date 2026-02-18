-- ============================================================
-- Migration 2 of 3: Row Level Security policies
-- All tables exist at this point (created in migration 1).
-- ============================================================

-- ── clients ─────────────────────────────────────────────────

CREATE POLICY "admins_all_clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "clients_select_own"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT client_id FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'client'
    )
  );

-- ── users ────────────────────────────────────────────────────

CREATE POLICY "admins_all_users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  );

CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ── deliverables ─────────────────────────────────────────────

CREATE POLICY "admins_all_deliverables"
  ON public.deliverables
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "clients_select_own_deliverables"
  ON public.deliverables
  FOR SELECT
  TO authenticated
  USING (
    client_id = (
      SELECT client_id FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'client'
    )
  );

-- ── comments ─────────────────────────────────────────────────

CREATE POLICY "admins_all_comments"
  ON public.comments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "clients_select_own_comments"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    deliverable_id IN (
      SELECT d.id FROM public.deliverables d
      JOIN public.users u ON u.id = auth.uid()
      WHERE d.client_id = u.client_id
        AND u.role = 'client'
    )
  );

CREATE POLICY "clients_insert_own_comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND deliverable_id IN (
      SELECT d.id FROM public.deliverables d
      JOIN public.users u ON u.id = auth.uid()
      WHERE d.client_id = u.client_id
        AND u.role = 'client'
    )
  );

-- ── posts ────────────────────────────────────────────────────

CREATE POLICY "admins_all_posts"
  ON public.posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "clients_select_own_posts"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    target_client_id IS NULL
    OR target_client_id = (
      SELECT client_id FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'client'
    )
  );

-- ── services ─────────────────────────────────────────────────

CREATE POLICY "admins_all_services"
  ON public.services
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "clients_select_own_services"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (
    array_length(target_client_ids, 1) IS NULL
    OR (
      SELECT client_id FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'client'
    ) = ANY(target_client_ids)
  );
