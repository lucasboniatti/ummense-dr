-- ============================================================
-- MIGRATION: Create Functions and Triggers
-- Version: 1.0
-- Description: Auto-update timestamps, metric refresh
-- ============================================================

-- 1. UPDATE TIMESTAMP FUNCTION
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER: Auto-update rules.updated_at
CREATE TRIGGER rules_updated_at
  BEFORE UPDATE ON public.rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();

-- 3. TRIGGER: Auto-update webhooks.updated_at
CREATE TRIGGER webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();

-- 4. FUNCTION: Calculate next retry time (exponential backoff)
CREATE OR REPLACE FUNCTION public.calculate_next_retry(attempt_count INT)
RETURNS INTERVAL AS $$
BEGIN
  -- Exponential backoff: 2^attempt_count seconds, max 300 seconds
  RETURN LEAST(
    INTERVAL '1 second' * POWER(2, attempt_count),
    INTERVAL '300 seconds'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. FUNCTION: Refresh automation metrics (called by scheduled job)
CREATE OR REPLACE FUNCTION public.refresh_automation_metrics()
RETURNS TABLE(user_id UUID, rules_count BIGINT, webhooks_count BIGINT, events_processed BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT
      u.id as user_id,
      COUNT(DISTINCT r.id) as rules_count,
      COUNT(DISTINCT w.id) as webhooks_count,
      COUNT(DISTINCT el.id) as events_processed,
      COUNT(CASE WHEN al.execution_status = 'failed' THEN 1 END) as automation_failures,
      COALESCE(AVG(al.duration_ms), 0)::INT as avg_execution_time_ms
    FROM auth.users u
    LEFT JOIN public.rules r ON r.user_id = u.id AND r.deleted_at IS NULL
    LEFT JOIN public.webhooks w ON w.user_id = u.id AND w.deleted_at IS NULL
    LEFT JOIN public.event_logs el ON el.user_id = u.id AND el.deleted_at IS NULL AND el.created_at::DATE = CURRENT_DATE
    LEFT JOIN public.automation_logs al ON al.created_at::DATE = CURRENT_DATE
    GROUP BY u.id
  )
  INSERT INTO public.automation_metrics (user_id, metric_date, rules_count, webhooks_count, events_processed, refreshed_at)
  SELECT
    user_id,
    CURRENT_DATE,
    rules_count,
    webhooks_count,
    events_processed,
    now()
  FROM daily_stats
  ON CONFLICT (user_id, metric_date) DO UPDATE SET
    rules_count = EXCLUDED.rules_count,
    webhooks_count = EXCLUDED.webhooks_count,
    events_processed = EXCLUDED.events_processed,
    refreshed_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
