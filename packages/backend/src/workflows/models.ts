/**
 * Workflow DAG Model Types
 * Directed Acyclic Graph for multi-step automations with conditional branching
 */

// Core workflow definition
export interface WorkflowDefinition {
  id: string; // automation_id
  name: string;
  description?: string;
  steps: WorkflowStep[];
  dependencies: Map<string, string[]>; // step_id -> [dependent_step_ids]
  created_at: Date;
  updated_at: Date;
}

// Individual workflow step
export type WorkflowStepType = "trigger" | "action" | "decision" | "aggregate";

export interface WorkflowStep {
  id: string; // Unique within workflow
  type: WorkflowStepType;
  name: string;
  config: Record<string, any>;

  // For decision steps only
  condition?: ConditionalLogic;
  true_branch?: string; // Step ID
  false_branch?: string; // Step ID
}

// Conditional logic evaluator
export interface ConditionalLogic {
  expression: string; // "trigger.value == 'active' AND previous.count > 10"
  variables: Map<string, any>; // Available variables for evaluation
}

// Execution context (passed between steps)
export interface ExecutionContext {
  automation_id: string;
  execution_id: string;
  trigger_data: Record<string, any>;
  step_outputs: Map<string, any>; // step_id -> output
  current_step: string;
  timestamp: Date;
}

// Step execution result
export interface StepExecutionResult {
  step_id: string;
  status: "success" | "failed" | "skipped";
  output?: any;
  error?: string;
  duration_ms: number;
  executed_at: Date;
}

// Workflow execution record
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  automation_id: string;
  trigger_data: Record<string, any>;
  status: "pending" | "running" | "completed" | "failed";
  step_executions: StepExecutionResult[];
  started_at: Date;
  completed_at?: Date;
  final_output?: any;
}

// DAG validation result
export interface DAGValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  cycle_check: boolean; // No cycles detected
}

// Workflow template (for save/load)
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  workflow_definition: WorkflowDefinition;
  version: string;
  created_at: Date;
  created_by: string;
}
