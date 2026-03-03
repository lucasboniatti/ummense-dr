-- Migration: Create execution tracking tables for Wave 3
-- Story 3.1: Workflow Execution Engine Refactor
-- Date: 2026-03-02

-- Create automation_executions table (extend existing)
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  trigger_type VARCHAR(50),
  trigger_data JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  error_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT duration_positive CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_automation_executions_automation_id
  ON automation_executions(automation_id);

CREATE INDEX IF NOT EXISTS idx_automation_executions_user_id
  ON automation_executions(user_id);

CREATE INDEX IF NOT EXISTS idx_automation_executions_status
  ON automation_executions(status);

CREATE INDEX IF NOT EXISTS idx_automation_executions_created_at
  ON automation_executions(created_at DESC);

-- Create automation_steps table (NEW in Wave 3)
CREATE TABLE IF NOT EXISTS automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES automation_executions(id) ON DELETE CASCADE,
  step_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  input JSONB NOT NULL,
  output JSONB,
  error_message TEXT,
  error_context JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraint: completed_at must be after started_at
  CONSTRAINT completed_after_started CHECK (completed_at IS NULL OR completed_at > started_at),
  CONSTRAINT duration_positive CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_automation_steps_execution_id
  ON automation_steps(execution_id);

CREATE INDEX IF NOT EXISTS idx_automation_steps_status
  ON automation_steps(status);

CREATE INDEX IF NOT EXISTS idx_automation_steps_created_at
  ON automation_steps(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_steps_step_id
  ON automation_steps(step_id);

-- Row-Level Security Policies (RLS)

-- automation_executions RLS
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY automation_executions_user_read
  ON automation_executions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY automation_executions_user_insert
  ON automation_executions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY automation_executions_user_update
  ON automation_executions FOR UPDATE
  USING (user_id = auth.uid());

-- automation_steps RLS (cascade from automation_executions)
ALTER TABLE automation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY automation_steps_user_read
  ON automation_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM automation_executions ae
      WHERE ae.id = automation_steps.execution_id
      AND ae.user_id = auth.uid()
    )
  );

CREATE POLICY automation_steps_user_insert
  ON automation_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM automation_executions ae
      WHERE ae.id = execution_id
      AND ae.user_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON automation_executions TO authenticated;
GRANT SELECT, INSERT ON automation_steps TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE automation_executions IS 'Tracks overall workflow execution (Story 3.1 Wave 3)';
COMMENT ON COLUMN automation_executions.status IS 'pending, running, success, failed';
COMMENT ON COLUMN automation_executions.trigger_type IS 'event, scheduled, manual';
COMMENT ON COLUMN automation_executions.duration_ms IS 'Total execution time in milliseconds';

COMMENT ON TABLE automation_steps IS 'Tracks individual step execution within a workflow (Story 3.1 Wave 3)';
COMMENT ON COLUMN automation_steps.step_id IS 'Step identifier from workflow definition';
COMMENT ON COLUMN automation_steps.input IS 'Execution context snapshot at step start';
COMMENT ON COLUMN automation_steps.output IS 'Step result output (nullable if failed)';
COMMENT ON COLUMN automation_steps.error_context IS 'Stack trace and state snapshot for debugging';
