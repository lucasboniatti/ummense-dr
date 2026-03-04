-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url VARCHAR(2048) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  api_key_hash VARCHAR(255) NOT NULL, -- Hashed API key
  api_key_preview VARCHAR(10) NOT NULL, -- Display format: sk_XXXX (last 4 chars)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP DEFAULT NULL, -- Soft delete
  CONSTRAINT valid_url CHECK (url ~ '^https://'),
  CONSTRAINT unique_user_webhook UNIQUE (user_id, url, deleted_at)
);

-- Compatibility for repositories that already had an older webhooks table
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(255);
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS api_key_preview VARCHAR(10);
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'dead_lettered')),
  attempt_count INT DEFAULT 1,
  request_headers JSONB,
  request_body JSONB,
  response_status_code INT,
  response_headers JSONB,
  response_body TEXT,
  error_message TEXT,
  elapsed_ms INT, -- Time taken to deliver (milliseconds)
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create webhook_events table (for audit/history)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'tested'
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  changes JSONB, -- What changed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  webhook_id UUID REFERENCES webhooks(id) ON DELETE SET NULL,
  event_name VARCHAR(100) NOT NULL, -- 'webhook.created', 'webhook.tested', etc.
  category VARCHAR(50) NOT NULL, -- 'webhook_management', 'webhook_testing', etc.
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON webhooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_deleted ON webhooks(user_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(webhook_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_date ON webhook_deliveries(webhook_id, created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_webhook_id ON analytics_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);

-- Enable RLS (Row Level Security)
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhooks
DROP POLICY IF EXISTS "Users can view their own webhooks" ON webhooks;
CREATE POLICY "Users can view their own webhooks" ON webhooks
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create webhooks" ON webhooks;
CREATE POLICY "Users can create webhooks" ON webhooks
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own webhooks" ON webhooks;
CREATE POLICY "Users can update their own webhooks" ON webhooks
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own webhooks" ON webhooks;
CREATE POLICY "Users can delete their own webhooks" ON webhooks
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for webhook_deliveries
DROP POLICY IF EXISTS "Users can view deliveries of their webhooks" ON webhook_deliveries;
CREATE POLICY "Users can view deliveries of their webhooks" ON webhook_deliveries
  FOR SELECT USING (
    webhook_id IN (
      SELECT id FROM webhooks WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for webhook_events
DROP POLICY IF EXISTS "Users can view events of their webhooks" ON webhook_events;
CREATE POLICY "Users can view events of their webhooks" ON webhook_events
  FOR SELECT USING (
    webhook_id IN (
      SELECT id FROM webhooks WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert events for their webhooks" ON webhook_events;
CREATE POLICY "Users can insert events for their webhooks" ON webhook_events
  FOR INSERT WITH CHECK (
    performed_by = auth.uid() AND
    webhook_id IN (
      SELECT id FROM webhooks WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for analytics_events
DROP POLICY IF EXISTS "Users can view their own analytics" ON analytics_events;
CREATE POLICY "Users can view their own analytics" ON analytics_events
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert analytics events" ON analytics_events;
CREATE POLICY "Users can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create function to update webhook updated_at on delivery
CREATE OR REPLACE FUNCTION update_webhook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE webhooks SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.webhook_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_delivery_update_timestamp ON webhook_deliveries;
CREATE TRIGGER webhook_delivery_update_timestamp
AFTER INSERT OR UPDATE ON webhook_deliveries
FOR EACH ROW
EXECUTE FUNCTION update_webhook_timestamp();

-- Create function to hash API key on insert (if using trigger-based hashing)
CREATE OR REPLACE FUNCTION hash_api_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.api_key_hash IS NULL THEN
    -- In production, use pgcrypto extension: NEW.api_key_hash = crypt(NEW.api_key, gen_salt('bf'));
    -- For now, just ensure it's set
    NEW.api_key_hash := substring(NEW.api_key_preview, 1, 10);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_api_key_hash ON webhooks;
CREATE TRIGGER webhook_api_key_hash
BEFORE INSERT ON webhooks
FOR EACH ROW
EXECUTE FUNCTION hash_api_key();

-- CRITICAL: Test these policies thoroughly before deploying
-- Run: SELECT * FROM webhooks WHERE user_id = auth.uid(); -- Should only show current user's webhooks
