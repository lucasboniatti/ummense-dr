-- Story 3.4: Multi-Step Workflow Builder & Conditional Logic
-- Create workflow definition and execution tracking tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: workflow_definitions
-- Stores the DAG structure and conditional logic for each workflow
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  workflow_description TEXT,

  -- DAG structure stored as JSON
  -- { steps: [{id, type, name, config, condition?, true_branch?, false_branch?}] }
  dag_structure JSONB NOT NULL,

  -- Dependencies map: { "step_id": ["dependent_step_1", "dependent_step_2"] }
  dependencies JSONB NOT NULL DEFAULT '{}',

  -- Validation status
  is_valid BOOLEAN DEFAULT true,
  validation_errors TEXT[],

  -- Metadata
  version INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,

  -- Foreign keys
  CONSTRAINT fk_automation FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_automation_id ON workflow_definitions(automation_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_created_at ON workflow_definitions(created_at);

-- Table: workflow_step_executions
-- Detailed audit log for each step execution (for observation and debugging)
CREATE TABLE IF NOT EXISTS workflow_step_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL,
  workflow_id UUID NOT NULL,

  -- Step information
  step_id VARCHAR(255) NOT NULL,
  step_type VARCHAR(50) NOT NULL, -- trigger, action, decision, aggregate
  step_name VARCHAR(255),

  -- Execution details
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, success, failed, skipped

  -- Context data
  input_context JSONB, -- Variables available to the step
  step_output JSONB,    -- Output from this step

  -- For decision steps only
  condition_expression TEXT,
  condition_evaluated_to BOOLEAN,
  taken_branch VARCHAR(50), -- 'true_branch' or 'false_branch'

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Performance metrics
  duration_ms INT,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT fk_execution FOREIGN KEY (execution_id) REFERENCES automation_executions(id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_step_executions_execution_id ON workflow_step_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_workflow_id ON workflow_step_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_status ON workflow_step_executions(status);
CREATE INDEX IF NOT EXISTS idx_step_executions_created_at ON workflow_step_executions(created_at);

-- Table: workflow_templates
-- Save/load workflow definitions as reusable templates
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,

  -- Template content (same structure as workflow_definitions.dag_structure)
  workflow_definition JSONB NOT NULL,

  -- Versioning
  version VARCHAR(20) DEFAULT '1.0.0',

  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Track usage
  usage_count INT DEFAULT 0
);

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_workflow_templates_created_at ON workflow_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_name ON workflow_templates(template_name);

-- Enable RLS (Row Level Security) for multi-tenant safety
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see workflows for their service
DROP POLICY IF EXISTS workflow_definitions_service_policy ON workflow_definitions;
CREATE POLICY workflow_definitions_service_policy ON workflow_definitions
  USING (
    EXISTS (
      SELECT 1 FROM automations
      WHERE automations.id = workflow_definitions.automation_id
        AND automations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflow_step_executions_service_policy ON workflow_step_executions;
CREATE POLICY workflow_step_executions_service_policy ON workflow_step_executions
  USING (
    EXISTS (
      SELECT 1 FROM automation_executions ae
      WHERE ae.id = workflow_step_executions.execution_id
        AND ae.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workflow_templates_service_policy ON workflow_templates;
CREATE POLICY workflow_templates_service_policy ON workflow_templates
  USING (
    created_by = auth.uid() OR created_by IS NULL
  );

-- Trigger: Update workflow_definitions.updated_at on change
CREATE OR REPLACE FUNCTION update_workflow_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_workflow_definitions_updated_at ON workflow_definitions;
CREATE TRIGGER trigger_update_workflow_definitions_updated_at
BEFORE UPDATE ON workflow_definitions
FOR EACH ROW
EXECUTE FUNCTION update_workflow_definitions_updated_at();

-- Trigger: Update workflow_templates.updated_at on change
CREATE OR REPLACE FUNCTION update_workflow_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_workflow_templates_updated_at ON workflow_templates;
CREATE TRIGGER trigger_update_workflow_templates_updated_at
BEFORE UPDATE ON workflow_templates
FOR EACH ROW
EXECUTE FUNCTION update_workflow_templates_updated_at();

-- Grant default permissions (adjust as needed for your multi-tenancy)
GRANT SELECT, INSERT, UPDATE ON workflow_definitions TO authenticated;
GRANT SELECT, INSERT ON workflow_step_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON workflow_templates TO authenticated;
