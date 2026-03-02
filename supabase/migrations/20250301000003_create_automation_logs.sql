-- ============================================================
-- MIGRATION: Create Automation Logs and Metrics Tables
-- Version: 1.0
-- Description: Execution logging and pre-aggregated metrics
-- ============================================================

-- 1. AUTOMATION_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.rules(id) ON DELETE SET NULL,
  event_id UUID NOT NULL,
  execution_status VARCHAR(20) NOT NULL,
  duration_ms INT,
  error_message VARCHAR(1000),
  result JSONB,
  created_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,

  CONSTRAINT execution_status_valid CHECK (execution_status IN ('pending', 'executing', 'success', 'failed')),
  CONSTRAINT duration_valid CHECK (duration_ms >= 0)
);

CREATE INDEX idx_automation_logs_rule_created ON public.automation_logs(rule_id, created_at DESC);
CREATE INDEX idx_automation_logs_status ON public.automation_logs(execution_status);
CREATE INDEX idx_automation_logs_created ON public.automation_logs(created_at DESC);

COMMENT ON TABLE public.automation_logs IS 'Automation execution logs with soft delete';

-- 2. AUTOMATION_METRICS TABLE
CREATE TABLE IF NOT EXISTS public.automation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  rules_count INT DEFAULT 0,
  webhooks_count INT DEFAULT 0,
  events_processed INT DEFAULT 0,
  automation_failures INT DEFAULT 0,
  avg_execution_time_ms INT DEFAULT 0,
  refreshed_at TIMESTAMP DEFAULT now(),

  CONSTRAINT unique_user_date UNIQUE(user_id, metric_date),
  CONSTRAINT counts_valid CHECK (rules_count >= 0 AND webhooks_count >= 0 AND events_processed >= 0)
);

CREATE INDEX idx_automation_metrics_user_date ON public.automation_metrics(user_id, metric_date DESC);
CREATE INDEX idx_automation_metrics_refreshed ON public.automation_metrics(refreshed_at DESC);

COMMENT ON TABLE public.automation_metrics IS 'Pre-aggregated metrics for dashboard queries';

-- Grant permissions
GRANT ALL ON public.automation_logs TO authenticated;
GRANT ALL ON public.automation_metrics TO authenticated;
