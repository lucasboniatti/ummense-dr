-- Story 3.6.4: Cost Monitoring & Analytics
-- Creates cost_snapshots table for tracking cost metrics over time
-- SECURITY: RLS policies enforce user isolation + indexed UNIQUE constraint on daily snapshots

-- Create cost snapshots table
CREATE TABLE IF NOT EXISTS public.cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  db_storage_gb DECIMAL(10,2) NOT NULL CHECK (db_storage_gb >= 0),
  s3_storage_gb DECIMAL(10,2) NOT NULL CHECK (s3_storage_gb >= 0),
  db_cost_monthly DECIMAL(10,4) NOT NULL CHECK (db_cost_monthly >= 0), -- RDS: $1.5/GB/month
  s3_cost_monthly DECIMAL(10,4) NOT NULL CHECK (s3_cost_monthly >= 0), -- S3: $0.023/GB/month
  monthly_savings DECIMAL(10,4) NOT NULL, -- (db_cost - s3_cost), can be negative
  seven_year_savings DECIMAL(12,4) NOT NULL, -- 7 * 12 * monthly_savings
  compression_ratio DECIMAL(5,2) NOT NULL CHECK (compression_ratio > 0), -- e.g., 3.5
  accuracy_percent DECIMAL(5,2) NOT NULL CHECK (accuracy_percent >= 0 AND accuracy_percent <= 100), -- 0-100%

  -- One snapshot per user per calendar day (for dashboard)
  -- Using indexed expression for efficient daily deduplication
  UNIQUE(user_id, (DATE(timestamp)))
);

-- Enable RLS - mandatory for user data isolation
ALTER TABLE public.cost_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only SELECT their own cost snapshots
CREATE POLICY "Users can select own cost snapshots"
  ON public.cost_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: INSERT policy - service role bypass for nightly job, but user inserts must match auth
CREATE POLICY "Users can insert own cost snapshots"
  ON public.cost_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  -- Note: service_role can bypass RLS (used by nightly job)

-- RLS Policy: PREVENT all updates (snapshots are immutable audit trail)
CREATE POLICY "Cost snapshots are immutable"
  ON public.cost_snapshots
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- RLS Policy: Users can DELETE own snapshots (rare, for data cleanup)
CREATE POLICY "Users can delete own cost snapshots"
  ON public.cost_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for dashboard queries (user + recent timestamps) - PRIMARY ACCESS PATTERN
CREATE INDEX IF NOT EXISTS idx_cost_snapshots_user_time
  ON public.cost_snapshots(user_id, timestamp DESC);

-- Index for daily snapshot uniqueness constraint (supports UNIQUE(user_id, DATE(timestamp)))
CREATE INDEX IF NOT EXISTS idx_cost_snapshots_user_date
  ON public.cost_snapshots(user_id, DATE(timestamp))
  WHERE timestamp IS NOT NULL;

-- Index for cost accuracy tracking (filtered for high-quality snapshots)
CREATE INDEX IF NOT EXISTS idx_cost_snapshots_accuracy
  ON public.cost_snapshots(user_id, accuracy_percent DESC)
  WHERE accuracy_percent >= 90; -- Only track snapshots within acceptable ±5% accuracy

-- Grant permissions - authenticated users can read/write their own data (enforced by RLS)
GRANT SELECT, INSERT, DELETE ON public.cost_snapshots TO authenticated;

-- Add comments for documentation and maintainability
COMMENT ON TABLE public.cost_snapshots IS 'Daily cost snapshots for cost monitoring dashboard. Tracks DB storage costs vs S3 archival savings. RLS ensures user isolation. Immutable snapshots (no updates). Service role can insert via nightly job.';
COMMENT ON COLUMN public.cost_snapshots.timestamp IS 'Snapshot timestamp (usually 2:00 AM UTC from nightly job). Used for daily deduplication via DATE(timestamp).';
COMMENT ON COLUMN public.cost_snapshots.compression_ratio IS 'Typical gzip compression ratio for JSON execution logs (3-5x). Used to estimate S3 storage savings.';
COMMENT ON COLUMN public.cost_snapshots.accuracy_percent IS 'Cost estimate accuracy (target 95 = ±5% variance allowed). Validates against AWS pricing API daily.';
COMMENT ON COLUMN public.cost_snapshots.monthly_savings IS 'Monthly cost savings: db_cost_monthly - s3_cost_monthly. Can be negative if S3 expensive for this data.';
