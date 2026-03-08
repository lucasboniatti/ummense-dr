-- ============================================================
-- MIGRATION: Add Discord OAuth token storage
-- Version: 1.0
-- Description: Dedicated Discord token persistence for Story 2.6
-- ============================================================

CREATE TABLE IF NOT EXISTS public.discord_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guild_id VARCHAR(32) NOT NULL,
  guild_name VARCHAR(255),
  encrypted_token TEXT NOT NULL,
  kms_key_id VARCHAR(255) NOT NULL,
  token_type VARCHAR(20) DEFAULT 'Bearer',
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,

  CONSTRAINT user_guild_unique UNIQUE(user_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_discord_tokens_user
  ON public.discord_tokens(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discord_tokens_guild
  ON public.discord_tokens(guild_id);

COMMENT ON TABLE public.discord_tokens IS 'KMS-encrypted Discord OAuth tokens';

ALTER TABLE IF EXISTS public.discord_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discord_tokens_select_own ON public.discord_tokens;
CREATE POLICY discord_tokens_select_own ON public.discord_tokens
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS discord_tokens_delete_own ON public.discord_tokens;
CREATE POLICY discord_tokens_delete_own ON public.discord_tokens
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS discord_tokens_service_select ON public.discord_tokens;
CREATE POLICY discord_tokens_service_select ON public.discord_tokens
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS discord_tokens_service_insert ON public.discord_tokens;
CREATE POLICY discord_tokens_service_insert ON public.discord_tokens
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS discord_tokens_service_update ON public.discord_tokens;
CREATE POLICY discord_tokens_service_update ON public.discord_tokens
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

GRANT ALL ON public.discord_tokens TO authenticated;
