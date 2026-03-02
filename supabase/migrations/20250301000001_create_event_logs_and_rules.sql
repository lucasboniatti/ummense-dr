-- ============================================================
-- MIGRATION: Create Event Logs and Rules Tables
-- Version: 1.0
-- Description: Core event stream and automation rules
-- Rollback: Handled by separate rollback script
-- ============================================================

-- 1. EVENT_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_id UUID NOT NULL,
  event_version INT DEFAULT 1,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,

  CONSTRAINT unique_event_dedup UNIQUE(user_id, event_id, event_type),
  CONSTRAINT event_type_valid CHECK (event_type ~ '^[a-z]+:[a-z]+$'),
  CONSTRAINT version_positive CHECK (event_version > 0)
);

CREATE INDEX idx_event_logs_user_created ON public.event_logs(user_id, created_at DESC);
CREATE INDEX idx_event_logs_event_type ON public.event_logs(event_type);
CREATE INDEX idx_event_logs_event_id ON public.event_logs(event_id);
CREATE INDEX idx_event_logs_deleted ON public.event_logs(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE public.event_logs IS 'Event stream with deduplication (UUID-based)';

-- 2. RULES TABLE
CREATE TABLE IF NOT EXISTS public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_name VARCHAR(255) NOT NULL,
  rule_version INT DEFAULT 1,
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  execution_count INT DEFAULT 0,
  last_execution_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,

  CONSTRAINT rule_name_unique UNIQUE(user_id, rule_name),
  CONSTRAINT rule_version_positive CHECK (rule_version > 0),
  CONSTRAINT execution_count_positive CHECK (execution_count >= 0)
);

CREATE INDEX idx_rules_user_enabled ON public.rules(user_id, enabled) WHERE enabled = true;
CREATE INDEX idx_rules_user_updated ON public.rules(user_id, updated_at DESC);

COMMENT ON TABLE public.rules IS 'Automation rules with loop detection and version tracking';

-- 3. RULE_HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.rule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.rules(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  change_type VARCHAR(20) NOT NULL,
  old_config JSONB,
  new_config JSONB,
  change_reason VARCHAR(500),
  changed_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,

  CONSTRAINT change_type_valid CHECK (change_type IN ('created', 'updated', 'deleted', 'enabled', 'disabled'))
);

CREATE INDEX idx_rule_history_rule_id ON public.rule_history(rule_id, changed_at DESC);
CREATE INDEX idx_rule_history_changed_by ON public.rule_history(changed_by);

COMMENT ON TABLE public.rule_history IS 'Audit trail for rule changes';

-- Grant permissions
GRANT ALL ON public.event_logs TO authenticated;
GRANT ALL ON public.rules TO authenticated;
GRANT ALL ON public.rule_history TO authenticated;
