-- ============================================================
-- MIGRATION: Create Webhooks and Delivery Tables
-- Version: 1.0
-- Description: Webhook endpoints and delivery tracking with retry logic
-- ============================================================

-- 1. WEBHOOKS TABLE
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url VARCHAR(2048) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  api_key_last_4 VARCHAR(4),
  is_active BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}'::JSONB,
  max_retries INT DEFAULT 5,
  timeout_seconds INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,

  CONSTRAINT url_unique UNIQUE(user_id, url),
  CONSTRAINT url_https CHECK (url LIKE 'https://%' OR url LIKE 'http://localhost%'),
  CONSTRAINT max_retries_valid CHECK (max_retries BETWEEN 1 AND 10),
  CONSTRAINT timeout_valid CHECK (timeout_seconds BETWEEN 5 AND 300)
);

CREATE INDEX idx_webhooks_user_active ON public.webhooks(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_webhooks_user_updated ON public.webhooks(user_id, updated_at DESC);

COMMENT ON TABLE public.webhooks IS 'Webhook endpoints with HTTPS enforcement and encrypted API keys';

-- 2. WEBHOOK_DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  response_status_code INT,
  response_body TEXT,
  error_message VARCHAR(500),
  created_at TIMESTAMP DEFAULT now(),
  is_dead_lettered BOOLEAN DEFAULT false,
  dead_letter_reason VARCHAR(500),

  CONSTRAINT status_valid CHECK (status IN ('pending', 'success', 'failed', 'dead_lettered')),
  CONSTRAINT attempt_count_valid CHECK (attempt_count >= 0),
  CONSTRAINT max_attempts_valid CHECK (max_attempts > 0)
);

CREATE INDEX idx_webhook_deliveries_webhook_pending ON public.webhook_deliveries(webhook_id, status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_webhook_deliveries_next_retry ON public.webhook_deliveries(next_retry_at) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_webhook_deliveries_dead_letter ON public.webhook_deliveries(is_dead_lettered) WHERE is_dead_lettered = true;
CREATE INDEX idx_webhook_deliveries_created ON public.webhook_deliveries(created_at DESC);

COMMENT ON TABLE public.webhook_deliveries IS 'Webhook delivery tracking with exponential backoff retry';

-- Grant permissions
GRANT ALL ON public.webhooks TO authenticated;
GRANT ALL ON public.webhook_deliveries TO authenticated;
