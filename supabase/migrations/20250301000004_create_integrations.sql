-- ============================================================
-- MIGRATION: Create Slack/Discord Integration Tables
-- Version: 1.0
-- Description: Token storage and integration logging
-- ============================================================

-- 1. SLACK_TOKENS TABLE
CREATE TABLE IF NOT EXISTS public.slack_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id VARCHAR(15) NOT NULL,
  encrypted_token TEXT NOT NULL,
  kms_key_id VARCHAR(255) NOT NULL,
  token_type VARCHAR(20) DEFAULT 'bot',
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,

  CONSTRAINT user_workspace_unique UNIQUE(user_id, workspace_id),
  CONSTRAINT token_type_valid CHECK (token_type IN ('bot', 'user', 'incoming_webhook'))
);

CREATE INDEX idx_slack_tokens_user ON public.slack_tokens(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_slack_tokens_workspace ON public.slack_tokens(workspace_id);

COMMENT ON TABLE public.slack_tokens IS 'KMS-encrypted Slack OAuth tokens';

-- 2. INTEGRATION_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  integration_type VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT action_valid CHECK (action IN ('created', 'updated', 'deleted', 'auth_refreshed', 'error'))
);

CREATE INDEX idx_integration_logs_user ON public.integration_logs(user_id, created_at DESC);
CREATE INDEX idx_integration_logs_type ON public.integration_logs(integration_type);

COMMENT ON TABLE public.integration_logs IS 'Audit trail for integration operations';

-- Grant permissions
GRANT ALL ON public.slack_tokens TO authenticated;
GRANT ALL ON public.integration_logs TO authenticated;
