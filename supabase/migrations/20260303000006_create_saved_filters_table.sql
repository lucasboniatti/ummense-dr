-- Story 3.6.3: Saved Searches & Filter Presets
-- Creates user_saved_filters table with RLS policies for secure preset storage

-- Create saved filters table
CREATE TABLE IF NOT EXISTS public.user_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filter_json JSONB NOT NULL DEFAULT '{}' CHECK (filter_json IS NOT NULL),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.user_saved_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only SELECT their own presets
CREATE POLICY "Users can select own presets"
  ON public.user_saved_filters
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only INSERT their own presets
CREATE POLICY "Users can insert own presets"
  ON public.user_saved_filters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only UPDATE their own non-default presets
CREATE POLICY "Users can update own non-default presets"
  ON public.user_saved_filters
  FOR UPDATE
  USING (auth.uid() = user_id AND NOT is_default)
  WITH CHECK (auth.uid() = user_id AND NOT is_default);

-- RLS Policy: Users can only DELETE (soft-delete) their own non-default presets
CREATE POLICY "Users can soft-delete own non-default presets"
  ON public.user_saved_filters
  FOR UPDATE
  USING (auth.uid() = user_id AND NOT is_default)
  WITH CHECK (auth.uid() = user_id AND NOT is_default);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_active
  ON public.user_saved_filters(user_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Index for default presets lookup
CREATE INDEX IF NOT EXISTS idx_saved_filters_default
  ON public.user_saved_filters(user_id, is_default)
  WHERE is_default = true AND deleted_at IS NULL;

-- Seed default presets for all users
-- Note: This is a one-time operation; in production, we'd seed on user signup
-- For now, we provide a stored procedure or handle in application code

-- Grant permissions
GRANT SELECT, INSERT ON public.user_saved_filters TO authenticated;
GRANT UPDATE ON public.user_saved_filters TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.user_saved_filters IS 'User-scoped saved filter presets for execution history queries. Supports soft-delete via deleted_at timestamp.';
COMMENT ON COLUMN public.user_saved_filters.filter_json IS 'Filter configuration as JSON: {searchTerm?, automationId?, status?, dateRange?, sort?}';
COMMENT ON COLUMN public.user_saved_filters.is_default IS 'True for system-provided presets (non-deletable). False for user-created presets.';
COMMENT ON COLUMN public.user_saved_filters.deleted_at IS 'Soft-delete timestamp. NULL = active preset. Set when user deletes (preserves audit trail).';
