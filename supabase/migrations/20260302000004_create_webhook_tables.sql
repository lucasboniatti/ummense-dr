-- Migration: Create webhook delivery and DLQ tables for Wave 3
-- Story 3.2: Webhook Reliability & Retry Logic
-- Date: 2026-03-02

-- Create webhook_deliveries table (NEW)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  webhook_id VARCHAR(2048) NOT NULL,              -- Webhook URL
  execution_id UUID REFERENCES automation_executions(id) ON DELETE SET NULL,
  attempt_number INT NOT NULL CHECK (attempt_number >= 1 AND attempt_number <= 5),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'dlq')),
  http_status_code INT,
  error_message TEXT,
  error_context JSONB,                            -- Full error details
  payload JSONB NOT NULL,
  signature VARCHAR(255) NOT NULL,                -- HMAC-SHA256 hex
  response_body TEXT,                             -- First 10KB of response
  duration_ms INT CHECK (duration_ms IS NULL OR duration_ms >= 0),
  next_retry_at TIMESTAMP WITH TIME ZONE,        -- For pending retries
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Compatibility for older webhook_deliveries schema
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES automations(id) ON DELETE CASCADE;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS execution_id UUID REFERENCES automation_executions(id) ON DELETE SET NULL;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS webhook_id VARCHAR(2048);
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS attempt_number INT DEFAULT 1;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS error_context JSONB;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS signature VARCHAR(255);
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS response_body TEXT;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS duration_ms INT;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_next_retry
  ON webhook_deliveries(status, next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_automation_id
  ON webhook_deliveries(automation_id);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_execution_id
  ON webhook_deliveries(execution_id);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at
  ON webhook_deliveries(created_at DESC);

-- Create dlq_items table (NEW)
CREATE TABLE IF NOT EXISTS dlq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  webhook_delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
  webhook_url VARCHAR(2048) NOT NULL,
  payload JSONB NOT NULL,
  retry_count INT NOT NULL CHECK (retry_count >= 1 AND retry_count <= 5),
  last_error TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  cleared_at TIMESTAMP WITH TIME ZONE,           -- Null until manually reviewed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlq_items_automation_id
  ON dlq_items(automation_id);

CREATE INDEX IF NOT EXISTS idx_dlq_items_webhook_delivery_id
  ON dlq_items(webhook_delivery_id);

CREATE INDEX IF NOT EXISTS idx_dlq_items_cleared_at
  ON dlq_items(cleared_at);

CREATE INDEX IF NOT EXISTS idx_dlq_items_created_at
  ON dlq_items(created_at DESC);

-- Row-Level Security Policies (RLS)

-- webhook_deliveries RLS
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_deliveries_user_read ON webhook_deliveries;
CREATE POLICY webhook_deliveries_user_read
  ON webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = webhook_deliveries.automation_id
      AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS webhook_deliveries_user_insert ON webhook_deliveries;
CREATE POLICY webhook_deliveries_user_insert
  ON webhook_deliveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = webhook_deliveries.automation_id
      AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS webhook_deliveries_user_update ON webhook_deliveries;
CREATE POLICY webhook_deliveries_user_update
  ON webhook_deliveries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = webhook_deliveries.automation_id
      AND a.user_id = auth.uid()
    )
  );

-- dlq_items RLS
ALTER TABLE dlq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dlq_items_user_read ON dlq_items;
CREATE POLICY dlq_items_user_read
  ON dlq_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = dlq_items.automation_id
      AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS dlq_items_user_insert ON dlq_items;
CREATE POLICY dlq_items_user_insert
  ON dlq_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = dlq_items.automation_id
      AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS dlq_items_user_update ON dlq_items;
CREATE POLICY dlq_items_user_update
  ON dlq_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM automations a
      WHERE a.id = dlq_items.automation_id
      AND a.user_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON webhook_deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON dlq_items TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE webhook_deliveries IS 'Tracks webhook delivery attempts with retry history (Story 3.2 Wave 3)';
COMMENT ON COLUMN webhook_deliveries.status IS 'pending, success, failed, dlq';
COMMENT ON COLUMN webhook_deliveries.attempt_number IS '1-5 retry attempts';
COMMENT ON COLUMN webhook_deliveries.next_retry_at IS 'Scheduled time for next retry (NULL if completed)';
COMMENT ON COLUMN webhook_deliveries.signature IS 'HMAC-SHA256 signature hex string';

COMMENT ON TABLE dlq_items IS 'Dead Letter Queue: permanently failed webhooks for manual review (Story 3.2 Wave 3)';
COMMENT ON COLUMN dlq_items.retry_count IS 'Total delivery attempts made (max 5)';
COMMENT ON COLUMN dlq_items.cleared_at IS 'Manual review timestamp (NULL = pending review)';
