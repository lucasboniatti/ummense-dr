-- 20260303_create_rate_limit_tables.sql

CREATE TABLE IF NOT EXISTS connector_rate_limits (
  connector_id TEXT PRIMARY KEY,
  rps INTEGER NOT NULL DEFAULT 10,
  concurrent INTEGER NOT NULL DEFAULT 20,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS circuit_breaker_states (
  connector_id TEXT PRIMARY KEY,
  failure_count INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'healthy' CHECK (state IN ('healthy', 'degraded', 'offline')),
  last_failure_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (though mostly backend managed, it's safer)
ALTER TABLE connector_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_states ENABLE ROW LEVEL SECURITY;

-- Allow reading for operations
CREATE POLICY "Admins can view rate limits" ON connector_rate_limits
  FOR SELECT USING (auth.uid() IN (SELECT id FROM user_roles WHERE role = 'admin'));
CREATE POLICY "Admins can manage rate limits" ON connector_rate_limits
  FOR ALL USING (auth.uid() IN (SELECT id FROM user_roles WHERE role = 'admin'));

CREATE POLICY "Admins can view circuit breaker states" ON circuit_breaker_states
  FOR SELECT USING (auth.uid() IN (SELECT id FROM user_roles WHERE role = 'admin'));
CREATE POLICY "Admins can manage circuit breaker states" ON circuit_breaker_states
  FOR ALL USING (auth.uid() IN (SELECT id FROM user_roles WHERE role = 'admin'));

-- Default Seed
INSERT INTO connector_rate_limits (connector_id, rps, concurrent)
VALUES 
  ('slack', 5, 10),
  ('email', 10, 50),
  ('custom_webhook', 20, 100)
ON CONFLICT (connector_id) DO NOTHING;
