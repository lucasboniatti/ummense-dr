-- Story 3.5: Automation Execution History & Audit Log
-- Create audit_logs, user_retention_policies, and indexes

-- Table: audit_logs (NEW)
-- Append-only audit trail for all user actions on automations
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table: user_retention_policies (NEW)
-- User-configurable retention settings (90-2190 days default 90)
CREATE TABLE IF NOT EXISTS user_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  retention_days INT NOT NULL DEFAULT 90,
  archive_enabled BOOLEAN DEFAULT false,
  archive_bucket VARCHAR(255),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at
ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_automation_id
ON audit_logs(automation_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_automation_created_at
ON audit_logs(user_id, automation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_retention_policies_user_id
ON user_retention_policies(user_id);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own audit logs
CREATE POLICY audit_logs_select_own ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY audit_logs_insert_own ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Audit logs are immutable - no UPDATE/DELETE allowed
-- This is intentional for compliance and forensic integrity

-- Enable RLS on user_retention_policies
ALTER TABLE user_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY retention_policies_select_own ON user_retention_policies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY retention_policies_update_own ON user_retention_policies
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY retention_policies_insert_own ON user_retention_policies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ensure execution_histories table exists (should be from Story 3.1)
-- This migration only adds audit_logs and retention_policies,
-- does not recreate execution_histories
CREATE TABLE IF NOT EXISTS execution_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  trigger_type VARCHAR(50),
  trigger_data JSONB,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INT,
  error_context JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for execution_histories if not already created
CREATE INDEX IF NOT EXISTS idx_execution_histories_user_automation_status
ON execution_histories(user_id, automation_id, status);

CREATE INDEX IF NOT EXISTS idx_execution_histories_created_at
ON execution_histories(created_at DESC);

-- Enable RLS on execution_histories
ALTER TABLE execution_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY execution_histories_select_own ON execution_histories
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY execution_histories_insert_own ON execution_histories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
