-- Story 3.6.4: Cost Monitoring & Analytics
-- Creates cost_snapshots table for tracking cost metrics over time

-- Create cost snapshots table
CREATE TABLE IF NOT EXISTS public.cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  db_storage_gb DECIMAL(10,2) NOT NULL,
  s3_storage_gb DECIMAL(10,2) NOT NULL,
  db_cost_monthly DECIMAL(10,4) NOT NULL, -- RDS: $1.5/GB/month
  s3_cost_monthly DECIMAL(10,4) NOT NULL, -- S3: $0.023/GB/month
  monthly_savings DECIMAL(10,4) NOT NULL, -- (db_cost - s3_cost)
  seven_year_savings DECIMAL(12,4) NOT NULL, -- 7 * 12 * monthly_savings
  compression_ratio DECIMAL(5,2) NOT NULL, -- e.g., 3.5
  accuracy_percent DECIMAL(5,2) NOT NULL, -- ±5% (calculated vs actual)

  -- One snapshot per user per day (for dashboard)
  UNIQUE(user_id, DATE(timestamp))
);

-- Enable RLS
ALTER TABLE public.cost_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only SELECT their own cost snapshots
CREATE POLICY "Users can select own cost snapshots"
  ON public.cost_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can INSERT snapshots (for nightly job)
CREATE POLICY "Service can insert cost snapshots"
  ON public.cost_snapshots
  FOR INSERT
  WITH CHECK (true); -- Service role bypass via authenticated context

-- Index for dashboard queries (user + recent timestamps)
CREATE INDEX IF NOT EXISTS idx_cost_snapshots_user_time
  ON public.cost_snapshots(user_id, timestamp DESC);

-- Index for cost accuracy tracking
CREATE INDEX IF NOT EXISTS idx_cost_snapshots_user_accuracy
  ON public.cost_snapshots(user_id, accuracy_percent)
  WHERE accuracy_percent >= 90; -- Only track snapshots within ±5% accuracy

-- Grant permissions
GRANT SELECT, INSERT ON public.cost_snapshots TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.cost_snapshots IS 'Daily cost snapshots tracking DB vs S3 archival costs';
COMMENT ON COLUMN public.cost_snapshots.compression_ratio IS 'Typical gzip compression ratio for archival (3-5x)';
COMMENT ON COLUMN public.cost_snapshots.accuracy_percent IS 'Cost estimate accuracy (95 = ±5% variance allowed)';
