-- ============================================================
-- MIGRATION: Apply Row-Level Security Policies
-- Version: 1.0
-- Description: User isolation, workspace isolation, service role bypass
-- ============================================================

-- Enable RLS on all automation tables
ALTER TABLE IF EXISTS public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rule_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.automation_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.slack_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.integration_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- EVENT_LOGS RLS
-- ============================================================

CREATE POLICY event_logs_select_own ON public.event_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY event_logs_insert_own ON public.event_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY event_logs_service_select ON public.event_logs
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY event_logs_service_insert ON public.event_logs
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- RULES RLS
-- ============================================================

CREATE POLICY rules_select_own ON public.rules
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY rules_insert_own ON public.rules
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY rules_update_own ON public.rules
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY rules_delete_own ON public.rules
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY rules_service_select ON public.rules
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- RULE_HISTORY RLS
-- ============================================================

CREATE POLICY rule_history_select_own ON public.rule_history
  FOR SELECT USING (
    rule_id IN (SELECT id FROM public.rules WHERE user_id = auth.uid())
  );

CREATE POLICY rule_history_insert_service ON public.rule_history
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- WEBHOOKS RLS
-- ============================================================

CREATE POLICY webhooks_select_own ON public.webhooks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY webhooks_insert_own ON public.webhooks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY webhooks_update_own ON public.webhooks
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY webhooks_delete_own ON public.webhooks
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY webhooks_service_select ON public.webhooks
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- WEBHOOK_DELIVERIES RLS
-- ============================================================

CREATE POLICY webhook_deliveries_select_own ON public.webhook_deliveries
  FOR SELECT USING (
    webhook_id IN (SELECT id FROM public.webhooks WHERE user_id = auth.uid())
  );

CREATE POLICY webhook_deliveries_service_all ON public.webhook_deliveries
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- AUTOMATION_LOGS RLS
-- ============================================================

CREATE POLICY automation_logs_select_own ON public.automation_logs
  FOR SELECT USING (
    rule_id IN (SELECT id FROM public.rules WHERE user_id = auth.uid())
  );

CREATE POLICY automation_logs_insert_service ON public.automation_logs
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- AUTOMATION_METRICS RLS
-- ============================================================

CREATE POLICY automation_metrics_select_own ON public.automation_metrics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY automation_metrics_service_all ON public.automation_metrics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- SLACK_TOKENS RLS
-- ============================================================

CREATE POLICY slack_tokens_select_own ON public.slack_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY slack_tokens_delete_own ON public.slack_tokens
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY slack_tokens_service_select ON public.slack_tokens
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY slack_tokens_service_insert ON public.slack_tokens
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- INTEGRATION_LOGS RLS
-- ============================================================

CREATE POLICY integration_logs_select_own ON public.integration_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY integration_logs_insert_service ON public.integration_logs
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
