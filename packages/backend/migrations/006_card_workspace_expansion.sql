ALTER TABLE IF EXISTS flows
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE IF EXISTS cards
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE IF EXISTS tags
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE IF EXISTS tasks
  ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;

ALTER TABLE IF EXISTS cards
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS card_timeline_events (
  id BIGSERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action VARCHAR(80) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_card_timeline_card_id ON card_timeline_events(card_id);
CREATE INDEX IF NOT EXISTS idx_card_timeline_created_at ON card_timeline_events(created_at DESC);
