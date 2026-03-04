-- Create automation_metrics table for pre-aggregated dashboard metrics
CREATE TABLE IF NOT EXISTS automation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hour_date TIMESTAMP NOT NULL,
  rules_count INT DEFAULT 0,
  webhooks_count INT DEFAULT 0,
  events_processed INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  total_execution_time_ms BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, hour_date)
);

-- Compatibility for older metric schema (Story 2.x/3.x)
ALTER TABLE automation_metrics ADD COLUMN IF NOT EXISTS hour_date TIMESTAMP;
ALTER TABLE automation_metrics ADD COLUMN IF NOT EXISTS success_count INT DEFAULT 0;
ALTER TABLE automation_metrics ADD COLUMN IF NOT EXISTS failed_count INT DEFAULT 0;
ALTER TABLE automation_metrics ADD COLUMN IF NOT EXISTS total_execution_time_ms BIGINT DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'automation_metrics'
      AND column_name = 'metric_date'
  ) THEN
    EXECUTE '
      UPDATE automation_metrics
      SET hour_date = metric_date::timestamp
      WHERE hour_date IS NULL
    ';
  END IF;
END $$;

-- Create automation_alerts table for threshold configuration
CREATE TABLE IF NOT EXISTS automation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  failure_rate_threshold NUMERIC(5,2) NOT NULL DEFAULT 50.0,
  enabled BOOLEAN DEFAULT true,
  last_alert_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, rule_id)
);

-- Create automation_logs table for detailed execution logs
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  webhook_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  execution_time_ms INT,
  error_message TEXT,
  rule_config JSONB,
  conditions JSONB,
  actions JSONB,
  error_trace TEXT,
  retry_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Compatibility for older automation_logs schema (execution_status/duration_ms)
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS webhook_id TEXT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS execution_status TEXT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMP DEFAULT NOW();
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS execution_time_ms INT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS duration_ms INT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS rule_config JSONB;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS conditions JSONB;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS actions JSONB;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS error_trace TEXT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS retry_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE automation_logs
SET
  status = COALESCE(status, execution_status, 'pending'),
  triggered_at = COALESCE(triggered_at, created_at, NOW()),
  execution_time_ms = COALESCE(execution_time_ms, duration_ms, 0)
WHERE status IS NULL
   OR triggered_at IS NULL
   OR execution_time_ms IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_metrics_user_hour ON automation_metrics(user_id, hour_date DESC);
CREATE INDEX IF NOT EXISTS idx_automation_alerts_user_rule ON automation_alerts(user_id, rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_rule ON automation_logs(user_id, rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_webhook ON automation_logs(user_id, webhook_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_status ON automation_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_triggered_at ON automation_logs(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_search ON automation_logs USING gin(to_tsvector('english', error_message));

-- Enable RLS on automation_metrics
ALTER TABLE automation_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own metrics
DROP POLICY IF EXISTS automation_metrics_select_own ON automation_metrics;
CREATE POLICY automation_metrics_select_own ON automation_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS automation_metrics_insert_own ON automation_metrics;
CREATE POLICY automation_metrics_insert_own ON automation_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS automation_metrics_update_own ON automation_metrics;
CREATE POLICY automation_metrics_update_own ON automation_metrics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on automation_alerts
ALTER TABLE automation_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_alerts_select_own ON automation_alerts;
CREATE POLICY automation_alerts_select_own ON automation_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS automation_alerts_insert_own ON automation_alerts;
CREATE POLICY automation_alerts_insert_own ON automation_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS automation_alerts_update_own ON automation_alerts;
CREATE POLICY automation_alerts_update_own ON automation_alerts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS automation_alerts_delete_own ON automation_alerts;
CREATE POLICY automation_alerts_delete_own ON automation_alerts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on automation_logs
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_logs_select_own ON automation_logs;
CREATE POLICY automation_logs_select_own ON automation_logs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS automation_logs_insert_own ON automation_logs;
CREATE POLICY automation_logs_insert_own ON automation_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to refresh automation_metrics
DROP FUNCTION IF EXISTS refresh_automation_metrics();
CREATE OR REPLACE FUNCTION refresh_automation_metrics()
RETURNS TABLE (user_id UUID, metrics_updated INT) AS $$
DECLARE
  v_user_id UUID;
  v_updated INT := 0;
  current_hour TIMESTAMP;
BEGIN
  -- Set current hour to the start of current hour
  current_hour := date_trunc('hour', NOW());

  -- Get all unique users with logs in the current hour
  FOR v_user_id IN
    SELECT DISTINCT user_id FROM automation_logs
    WHERE triggered_at >= current_hour AND triggered_at < current_hour + INTERVAL '1 hour'
  LOOP
    -- Upsert metrics for this user and hour
    INSERT INTO automation_metrics (user_id, hour_date, rules_count, webhooks_count, events_processed, success_count, failed_count, total_execution_time_ms)
    SELECT
      v_user_id,
      current_hour,
      (SELECT COUNT(DISTINCT rule_id) FROM automation_logs WHERE user_id = v_user_id AND triggered_at >= current_hour AND triggered_at < current_hour + INTERVAL '1 hour'),
      (SELECT COUNT(DISTINCT webhook_id) FROM automation_logs WHERE user_id = v_user_id AND webhook_id IS NOT NULL AND triggered_at >= current_hour AND triggered_at < current_hour + INTERVAL '1 hour'),
      COUNT(*),
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END),
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END),
      COALESCE(SUM(execution_time_ms), 0)
    FROM automation_logs
    WHERE user_id = v_user_id AND triggered_at >= current_hour AND triggered_at < current_hour + INTERVAL '1 hour'
    ON CONFLICT (user_id, hour_date)
    DO UPDATE SET
      rules_count = EXCLUDED.rules_count,
      webhooks_count = EXCLUDED.webhooks_count,
      events_processed = EXCLUDED.events_processed,
      success_count = EXCLUDED.success_count,
      failed_count = EXCLUDED.failed_count,
      total_execution_time_ms = EXCLUDED.total_execution_time_ms,
      updated_at = NOW();

    v_updated := v_updated + 1;
  END LOOP;

  RETURN QUERY SELECT v_user_id, v_updated;
END;
$$ LANGUAGE plpgsql;

-- Create function to get dashboard metrics for current user
DROP FUNCTION IF EXISTS get_dashboard_metrics(UUID);
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_user_id UUID)
RETURNS TABLE (
  rules_count BIGINT,
  webhooks_count BIGINT,
  events_processed_24h BIGINT,
  success_rate NUMERIC,
  avg_execution_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT rule_id)::BIGINT,
    COUNT(DISTINCT webhook_id)::BIGINT,
    COUNT(*)::BIGINT,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100, 2)
    END,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND(AVG(COALESCE(execution_time_ms, 0))::NUMERIC, 2)
    END
  FROM automation_logs
  WHERE user_id = p_user_id
    AND triggered_at >= NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create function to get top failing rules
DROP FUNCTION IF EXISTS get_top_failing_rules(UUID, INT);
CREATE OR REPLACE FUNCTION get_top_failing_rules(p_user_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  rule_id TEXT,
  rule_name TEXT,
  failures BIGINT,
  successes BIGINT,
  failure_rate NUMERIC,
  last_failure TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.rule_id,
    al.rule_id,
    SUM(CASE WHEN al.status = 'failed' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN al.status = 'success' THEN 1 ELSE 0 END)::BIGINT,
    ROUND((SUM(CASE WHEN al.status = 'failed' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100, 2),
    MAX(al.triggered_at)
  FROM automation_logs al
  WHERE al.user_id = p_user_id
    AND al.triggered_at >= NOW() - INTERVAL '24 hours'
  GROUP BY al.rule_id
  ORDER BY SUM(CASE WHEN al.status = 'failed' THEN 1 ELSE 0 END) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to get 7-day time series
DROP FUNCTION IF EXISTS get_time_series(UUID);
CREATE OR REPLACE FUNCTION get_time_series(p_user_id UUID)
RETURNS TABLE (
  date TEXT,
  success BIGINT,
  failed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('day', triggered_at), 'YYYY-MM-DD'),
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::BIGINT,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::BIGINT
  FROM automation_logs
  WHERE user_id = p_user_id
    AND triggered_at >= NOW() - INTERVAL '7 days'
  GROUP BY DATE_TRUNC('day', triggered_at)
  ORDER BY DATE_TRUNC('day', triggered_at) DESC;
END;
$$ LANGUAGE plpgsql;
