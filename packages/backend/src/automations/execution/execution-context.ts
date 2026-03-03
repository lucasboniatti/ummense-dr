/**
 * Execution Context - Shared context passed to each step during workflow execution
 * Story 3.1: Workflow Execution Engine Refactor
 */

export interface ExecutionContext {
  /** Unique identifier for the automation being executed */
  automationId: string;

  /** Unique identifier for this execution instance */
  executionId: string;

  /** User who triggered the automation */
  userId: string;

  /** Type of trigger: event, scheduled, manual */
  triggerType: string;

  /** Raw data from the trigger (event payload, webhook body, etc.) */
  triggerData: Record<string, unknown>;

  /** Outputs from previous steps: {stepId: output} */
  stepOutputs: Record<string, unknown>;

  /** User-defined variables for this automation */
  variables: Record<string, unknown>;

  /** ISO-8601 timestamp of execution start (UTC) */
  timestamp: string;
}

/**
 * Builder for ExecutionContext - ensures all required fields are set
 */
export class ExecutionContextBuilder {
  private context: Partial<ExecutionContext> = {};

  setAutomationId(id: string): this {
    this.context.automationId = id;
    return this;
  }

  setExecutionId(id: string): this {
    this.context.executionId = id;
    return this;
  }

  setUserId(id: string): this {
    this.context.userId = id;
    return this;
  }

  setTriggerType(type: string): this {
    this.context.triggerType = type;
    return this;
  }

  setTriggerData(data: Record<string, unknown>): this {
    this.context.triggerData = data;
    return this;
  }

  setStepOutputs(outputs: Record<string, unknown>): this {
    this.context.stepOutputs = outputs ?? {};
    return this;
  }

  setVariables(variables: Record<string, unknown>): this {
    this.context.variables = variables ?? {};
    return this;
  }

  setTimestamp(ts: string): this {
    this.context.timestamp = ts;
    return this;
  }

  build(): ExecutionContext {
    // Validate all required fields
    const required = [
      'automationId',
      'executionId',
      'userId',
      'triggerType',
      'timestamp',
    ];
    for (const field of required) {
      if (!this.context[field as keyof ExecutionContext]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return this.context as ExecutionContext;
  }
}

/**
 * Immutable copy of context to prevent side effects during step execution
 */
export function freezeContext(context: ExecutionContext): ExecutionContext {
  return Object.freeze(
    JSON.parse(JSON.stringify(context))
  ) as ExecutionContext;
}
