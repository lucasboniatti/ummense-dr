/**
 * Migration: Create webhook audit logs table
 * Story 3.2: Webhook Reliability & Retry Logic
 * Immutable audit log for all webhook delivery attempts
 */

-- Create webhook_delivery_audit_logs table
CREATE TABLE IF NOT EXISTS webhook_delivery_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  webhook_delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
  webhook_url VARCHAR(2048) NOT NULL,
  attempt_number INT NOT NULL CHECK (attempt_number >= 1),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'timeout')),
  http_status_code INT,
  error_message TEXT,
  response_time INT NOT NULL CHECK (response_time >= 0),
  payload_size INT NOT NULL CHECK (payload_size >= 0),
  response_size INT,
  request_headers JSONB,
  response_headers JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_webhook_audit_logs_webhook_delivery_id
  ON webhook_delivery_audit_logs(webhook_delivery_id);

CREATE INDEX idx_webhook_audit_logs_automation_id
  ON webhook_delivery_audit_logs(automation_id);

CREATE INDEX idx_webhook_audit_logs_created_at
  ON webhook_delivery_audit_logs(created_at DESC);

CREATE INDEX idx_webhook_audit_logs_status
  ON webhook_delivery_audit_logs(status);

CREATE INDEX idx_webhook_audit_logs_attempt
  ON webhook_delivery_audit_logs(automation_id, created_at DESC, attempt_number);

-- Enable RLS on audit logs
ALTER TABLE webhook_delivery_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view audit logs for their automations
CREATE POLICY "Users can view audit logs for their automations"
  ON webhook_delivery_audit_logs FOR SELECT
  USING (
    automation_id IN (
      SELECT id FROM automations
      WHERE workspace_id = (
        SELECT workspace_id FROM user_workspaces
        WHERE user_id = auth.uid()
        LIMIT 1
      )
    )
  );

-- RLS Policy: Only authenticated users can insert (backend only)
CREATE POLICY "Authenticated users can insert audit logs"
  ON webhook_delivery_audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policy: Audit logs are immutable - no updates
CREATE POLICY "Audit logs cannot be updated"
  ON webhook_delivery_audit_logs FOR UPDATE
  USING (false);

-- RLS Policy: Audit logs can only be deleted by admin/system
CREATE POLICY "Only admins can delete audit logs"
  ON webhook_delivery_audit_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_workspaces uw
      JOIN workspace_members wm ON uw.workspace_id = wm.workspace_id
      WHERE uw.user_id = auth.uid()
        AND wm.user_id = auth.uid()
        AND wm.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON webhook_delivery_audit_logs TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE webhook_delivery_audit_logs IS
  'Immutable audit log for webhook delivery attempts. Append-only, no updates.';

COMMENT ON COLUMN webhook_delivery_audit_logs.attempt_number IS
  'Retry attempt number (1-5)';

COMMENT ON COLUMN webhook_delivery_audit_logs.response_time IS
  'Time taken for delivery attempt in milliseconds';

COMMENT ON COLUMN webhook_delivery_audit_logs.payload_size IS
  'Size of the webhook payload in bytes';

COMMENT ON COLUMN webhook_delivery_audit_logs.response_size IS
  'Size of the response body in bytes';
