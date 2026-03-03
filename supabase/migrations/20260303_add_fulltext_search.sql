-- Story 3.5.1: Full-Text Search Enhancement
-- Add tsvector columns for full-text search on execution history and audit logs

-- Add search_vector column to execution_histories table
ALTER TABLE execution_histories
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search_vector column to audit_logs table
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN indexes for fast full-text search
-- GIN (Generalized Inverted Index) is optimal for tsvector queries
CREATE INDEX IF NOT EXISTS idx_execution_histories_search
ON execution_histories USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_audit_logs_search
ON audit_logs USING GIN(search_vector);

-- Function to update execution_histories search_vector on insert/update
-- This function will be called by triggers
CREATE OR REPLACE FUNCTION update_execution_histories_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.error_context::text, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(
                          (SELECT name FROM automations WHERE id = NEW.automation_id),
                          ''
                        )), 'B') ||
                        setweight(to_tsvector('english', COALESCE(
                          (SELECT jsonb_extract_path_text(NEW.trigger_data, 'description'), '')
                        )), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update audit_logs search_vector on insert/update
CREATE OR REPLACE FUNCTION update_audit_logs_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.action, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(
                          jsonb_to_text(NEW.old_values || NEW.new_values), ''
                        )), 'B') ||
                        setweight(to_tsvector('english', COALESCE(NEW.user_agent, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for execution_histories
DROP TRIGGER IF EXISTS trg_execution_histories_search_vector ON execution_histories;
CREATE TRIGGER trg_execution_histories_search_vector
BEFORE INSERT OR UPDATE ON execution_histories
FOR EACH ROW
EXECUTE FUNCTION update_execution_histories_search_vector();

-- Create trigger for audit_logs
DROP TRIGGER IF EXISTS trg_audit_logs_search_vector ON audit_logs;
CREATE TRIGGER trg_audit_logs_search_vector
BEFORE INSERT OR UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION update_audit_logs_search_vector();

-- Update existing execution_histories records to populate search_vector
UPDATE execution_histories
SET search_vector = setweight(to_tsvector('english', COALESCE(error_context::text, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(
                      (SELECT name FROM automations WHERE id = execution_histories.automation_id),
                      ''
                    )), 'B')
WHERE search_vector IS NULL;

-- Update existing audit_logs records to populate search_vector
UPDATE audit_logs
SET search_vector = setweight(to_tsvector('english', COALESCE(action, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(
                      jsonb_to_text(old_values || new_values), ''
                    )), 'B')
WHERE search_vector IS NULL;

-- Helper function for JSON to text conversion (if not exists)
CREATE OR REPLACE FUNCTION jsonb_to_text(data JSONB)
RETURNS TEXT AS $$
  SELECT string_agg(value, ' ')
  FROM jsonb_each_text(data)
  WHERE value IS NOT NULL AND value != '';
$$ LANGUAGE SQL IMMUTABLE;
