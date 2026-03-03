-- Migration: Create automation_schedules table for Story 3.3
-- Story 3.3: Scheduled Automations & Cron Support
-- Date: 2026-03-03

-- Create automation_schedules table (NEW)
CREATE TABLE IF NOT EXISTS automation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  cron_expression VARCHAR(100) NOT NULL,    -- e.g., "0 9 * * MON-FRI"
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_execution_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,    -- Computed, updated after each run
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  UNIQUE(automation_id)                     -- One schedule per automation
);

-- Create index for scheduler query (critical for performance)
CREATE INDEX IF NOT EXISTS idx_automation_schedules_enabled_next_exec
  ON automation_schedules(enabled, next_execution_at)
  WHERE enabled = true;

-- Create index for automation_id lookups
CREATE INDEX IF NOT EXISTS idx_automation_schedules_automation_id
  ON automation_schedules(automation_id);

-- Extend automation_executions table (from Story 3.1)
ALTER TABLE automation_executions
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE,    -- What time cron said
ADD COLUMN IF NOT EXISTS execution_drift_seconds INT CHECK (execution_drift_seconds IS NULL OR execution_drift_seconds >= 0);

-- Row-Level Security Policies (RLS)

-- Enable RLS on automation_schedules
ALTER TABLE automation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS automation_schedules_user_read
  ON automation_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = automation_schedules.automation_id
      AND a.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS automation_schedules_user_insert
  ON automation_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = automation_schedules.automation_id
      AND a.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS automation_schedules_user_update
  ON automation_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = automation_schedules.automation_id
      AND a.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS automation_schedules_user_delete
  ON automation_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = automation_schedules.automation_id
      AND a.user_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON automation_schedules TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE automation_schedules IS 'Scheduled automation execution configuration (Story 3.3 Wave 3)';
COMMENT ON COLUMN automation_schedules.cron_expression IS 'Cron expression for scheduling (e.g., "0 9 * * MON-FRI")';
COMMENT ON COLUMN automation_schedules.timezone IS 'User timezone for schedule evaluation (IANA format, default UTC)';
COMMENT ON COLUMN automation_schedules.enabled IS 'Whether schedule is active (can be toggled without deletion)';
COMMENT ON COLUMN automation_schedules.next_execution_at IS 'Computed next execution time (updated after each run)';
