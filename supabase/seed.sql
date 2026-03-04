-- Local seed for Story 4.3
-- Keeps seed idempotent for repeated reset/bootstrap runs.

INSERT INTO connector_rate_limits (connector_id, rps, concurrent)
VALUES
  ('slack', 5, 10),
  ('email', 10, 50),
  ('custom_webhook', 20, 100),
  ('discord', 8, 20)
ON CONFLICT (connector_id)
DO UPDATE SET
  rps = EXCLUDED.rps,
  concurrent = EXCLUDED.concurrent,
  updated_at = timezone('utc'::text, now());

INSERT INTO circuit_breaker_states (connector_id, failure_count, state, updated_at)
VALUES
  ('slack', 0, 'healthy', timezone('utc'::text, now())),
  ('discord', 0, 'healthy', timezone('utc'::text, now()))
ON CONFLICT (connector_id)
DO UPDATE SET
  failure_count = EXCLUDED.failure_count,
  state = EXCLUDED.state,
  updated_at = EXCLUDED.updated_at;
