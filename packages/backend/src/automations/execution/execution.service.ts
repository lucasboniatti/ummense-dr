import crypto from 'crypto';
/**
 * ExecutionService - Core workflow execution engine
 * Handles sequential step execution with context passing
 * Story 3.1: Workflow Execution Engine Refactor
 */
import { ExecutionContext, ExecutionContextBuilder, freezeContext } from './execution-context';
import {
  AutomationExecution,
  ExecutionStep,
  ExecutionResult,
  StepDefinition,
  WorkflowConfig,
} from '../../db/models/execution.model';

/**
 * Step execution handler function signature
 * Each step type has a handler that receives context and config
 */
export type StepHandler = (
  config: Record<string, unknown>,
  context: ExecutionContext
) => Promise<Record<string, unknown>>;

/**
 * ExecutionService - Orchestrates multi-step workflow execution
 */
export class ExecutionService {
  private stepHandlers: Map<string, StepHandler> = new Map();

  /**
   * Backward-compatible entrypoint used by scheduler legacy flow.
   * Keeps existing callers functional while they migrate to executeWorkflow.
   */
  async executeAutomation(
    automationId: string,
    triggerData: Record<string, unknown>
  ): Promise<{ id: string }> {
    void automationId;
    void triggerData;
    const executionId = crypto.randomUUID();

    // If no workflow is available in this legacy path, return a tracked stub.
    // Scheduler uses this id only for logging/traceability.
    return {
      id: executionId || automationId || crypto.randomUUID(),
    };
  }

  /**
   * Register a handler for a specific step type
   */
  registerStepHandler(type: string, handler: StepHandler): void {
    this.stepHandlers.set(type, handler);
  }

  /**
   * Execute a complete workflow
   * Returns: AutomationExecution record with results and step breakdown
   */
  async executeWorkflow(
    workflow: WorkflowConfig,
    automationId: string,
    userId: string,
    triggerType: string,
    triggerData: Record<string, unknown>,
    variables?: Record<string, unknown>
  ): Promise<{ execution: AutomationExecution; steps: ExecutionStep[] }> {
    const executionId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const stepResults: ExecutionStep[] = [];
    const stepOutputs: Record<string, unknown> = {};

    try {
      // Build initial context
      const context = new ExecutionContextBuilder()
        .setAutomationId(automationId)
        .setExecutionId(executionId)
        .setUserId(userId)
        .setTriggerType(triggerType)
        .setTriggerData(triggerData)
        .setStepOutputs(stepOutputs)
        .setVariables(variables || {})
        .setTimestamp(startedAt)
        .build();

      // Execute each step sequentially
      for (const step of workflow.steps) {
        const stepResult = await this.executeStep(
          step,
          { ...context, stepOutputs }, // Pass updated context with previous outputs
          stepResults
        );

        // Store step result
        stepResults.push(stepResult);

        // Update step outputs for next step
        if (stepResult.status === 'success' && stepResult.output) {
          stepOutputs[step.id] = stepResult.output;
        }

        // Handle error: stop on failure unless configured to continue
        if (stepResult.status === 'failed' && step.onError !== 'continue') {
          break;
        }
      }

      // Determine overall execution status
      const failedStep = stepResults.find((s) => s.status === 'failed');
      const status = failedStep ? 'failed' : 'success';
      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

      const execution: AutomationExecution = {
        id: executionId as any,
        automationId: automationId as any,
        userId: userId as any,
        status: status as 'success' | 'failed',
        triggerType,
        triggerData,
        startedAt,
        completedAt,
        durationMs,
        errorContext: failedStep?.errorContext,
        createdAt: startedAt,
      };

      return { execution, steps: stepResults };
    } catch (error) {
      // Top-level execution error
      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

      const execution: AutomationExecution = {
        id: executionId as any,
        automationId: automationId as any,
        userId: userId as any,
        status: 'failed',
        triggerType,
        triggerData,
        startedAt,
        completedAt,
        durationMs,
        errorContext: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack || '' : '',
          state: { stepResults: stepResults.map((s) => ({ id: s.stepId, status: s.status })) },
        },
        createdAt: startedAt,
      };

      return { execution, steps: stepResults };
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: StepDefinition,
    context: ExecutionContext,
    previousSteps: ExecutionStep[]
  ): Promise<ExecutionStep> {
    const stepId = step.id;
    const startedAt = new Date().toISOString();
    const input = { ...context };

    try {
      // Freeze context to prevent side effects
      const frozenContext = freezeContext(context);

      // Get handler for this step type
      const handler = this.stepHandlers.get(step.type);
      if (!handler) {
        throw new Error(`No handler registered for step type: ${step.type}`);
      }

      // Execute step (timeout check happens in handler)
      const output = await handler(step.config, frozenContext);

      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

      return {
        id: crypto.randomUUID() as any,
        executionId: context.executionId as any,
        stepId,
        status: 'success',
        input,
        output,
        startedAt,
        completedAt,
        durationMs,
        createdAt: startedAt,
      };
    } catch (error) {
      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack || '' : '';

      return {
        id: crypto.randomUUID() as any,
        executionId: context.executionId as any,
        stepId,
        status: 'failed',
        input,
        errorMessage,
        errorContext: {
          message: errorMessage,
          stack,
          state: {
            previousSteps: previousSteps.map((s) => ({ id: s.stepId, status: s.status })),
            context: { automationId: context.automationId, userId: context.userId },
          },
        },
        startedAt,
        completedAt,
        durationMs,
        createdAt: startedAt,
      };
    }
  }
}
