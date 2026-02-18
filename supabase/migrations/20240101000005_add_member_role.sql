-- ============================================================
-- Migration 5a: Add 'member' enum value
--
-- Must run in its own transaction BEFORE migration 5b,
-- because PostgreSQL requires a COMMIT between ADD VALUE
-- and any use of the new enum value.
-- ============================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'member';
