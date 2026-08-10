-- ============================================================
-- 028: Baseline for system_announcements.
--
-- The table exists in the hosted database and migrations 018 and 019 alter its
-- policies, but no migration ever created it. A database rebuilt from this repo
-- fails on 018. This migration closes that gap.
--
-- The definition below was dumped from the hosted database on 2026-08-09 and
-- must match it exactly. On the hosted database this migration is a no-op:
-- CREATE TABLE IF NOT EXISTS skips the table, and every constraint is declared
-- inline so nothing is re-applied. Policies stay in 018 and 019.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message     TEXT        NOT NULL
                CONSTRAINT announcements_message_length CHECK (char_length(message) <= 500),
  type        TEXT        NOT NULL DEFAULT 'info'
                CHECK (type IN ('info', 'warning', 'maintenance', 'update')),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ
);

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
