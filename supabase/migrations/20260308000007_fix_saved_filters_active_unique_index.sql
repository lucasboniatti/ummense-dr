-- Story 3.6.3 follow-up
-- Allow preset names to be reused after soft-delete while preserving audit trail.

ALTER TABLE IF EXISTS public.user_saved_filters
  DROP CONSTRAINT IF EXISTS user_saved_filters_user_id_name_key;

DROP INDEX IF EXISTS public.idx_saved_filters_user_active_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_filters_user_active_name
  ON public.user_saved_filters (user_id, lower(name))
  WHERE deleted_at IS NULL;
