/**
 * Execution Models - Database models for execution tracking
 * Story 3.1: Workflow Execution Engine Refactor
 */

import { UUID } from 'crypto';

/**
 * ExecutionStep - Tracks a single step execution within a workflow
 * Persisted to automation_steps table
 */
export interface ExecutionStep {
  /** UUID primary key */
  id: UUID;

  /** Foreign key to automation_executions */
  executionId: UUID;

  /** Step identifier from workflow definition */
  stepId: string;

  /** Current status: pending, running, success, failed */
  status: 'pending' | 'running' | 'success' | 'failed';

  /** Step input (execution context snapshot at step start) */
  input: Record<string, unknown>;

  /** Step output (nullable if failed) */
  output?: Record<string, unknown>;

  /** Error message if status === 'failed' */
  errorMessage?: string;

  /** Detailed error context (stack trace, state snapshot) */
  errorContext?: {
    message: string;
    stack: string;
    state: Record<string, unknown>;
  };

  /** ISO-8601 timestamp when step started */
  startedAt: string;

  /** ISO-8601 timestamp when step completed (null if still running) */
  completedAt?: string;

  /** Duration in milliseconds */
  durationMs?: number;

  /** ISO-8601 timestamp when record was created */
  createdAt: string;
}

/**
 * AutomationExecution - Tracks overall workflow execution
 * Persisted to automation_executions table
 */
export interface AutomationExecution {
  /** UUID primary key */
  id: UUID;

  /** Foreign key to automations table */
  automationId: UUID;

  /** Foreign key to auth.users table */
  userId: UUID;

  /** Overall status: pending, running, success, failed */
  status: 'pending' | 'running' | 'success' | 'failed';

  /** How the automation was triggered: event, scheduled, manual */
  triggerType: string;

  /** Raw trigger data (webhook payload, event data, etc.) */
  triggerData: Record<string, unknown>;

  /** ISO-8601 timestamp when execution started */
  startedAt: string;

  /** ISO-8601 timestamp when execution completed */
  completedAt?: string;

  /** Total duration in milliseconds */
  durationMs?: number;

  /** Execution-level error context if failed */
  errorContext?: {
    message: string;
    stack: string;
    state: Record<string, unknown>;
  };

  /** ISO-8601 timestamp when record was created */
  createdAt: string;
}

/**
 * Result from a single step execution
 */
export interface ExecutionResult {
  /** Step identifier */
  stepId: string;

  /** Execution result: success or failed */
  status: 'success' | 'failed';

  /** Step output (only if status === 'success') */
  output?: Record<string, unknown>;

  /** Error message (only if status === 'failed') */
  errorMessage?: string;

  /** Detailed error context for debugging */
  errorContext?: {
    message: string;
    stack: string;
    state: Record<string, unknown>;
  };

  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Step definition from workflow configuration
 */
export interface StepDefinition {
  /** Unique identifier within the workflow */
  id: string;

  /** Step type: webhook, conditional, action, etc. */
  type: string;

  /** Step configuration (varies by type) */
  config: Record<string, unknown>;

  /** Error handling: continue on error or fail */
  onError?: 'continue' | 'fail';
}

/**
 * Workflow configuration containing multiple steps
 */
export interface WorkflowConfig {
  /** Workflow/automation identifier */
  id: string;

  /** Workflow version (2 = converted Wave 2, 3+ = native multi-step) */
  version: number;

  /** Array of steps to execute sequentially */
  steps: StepDefinition[];
}
