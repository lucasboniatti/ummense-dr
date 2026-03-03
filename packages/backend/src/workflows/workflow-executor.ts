/**
 * Workflow Executor
 * Executes DAG workflows with conditional branching and context passing
 */

import { WorkflowDefinition, ExecutionContext, StepExecutionResult, WorkflowExecution } from "./models";
import { ConditionalEvaluator } from "./conditional-evaluator";

export class WorkflowExecutor {
  /**
   * Execute a complete workflow
   */
  static async execute(
    workflow: WorkflowDefinition,
    triggerData: Record<string, any>,
    automationId: string
  ): Promise<WorkflowExecution> {
    const executionId = this.generateId();
    const context: ExecutionContext = {
      automation_id: automationId,
      execution_id: executionId,
      trigger_data: triggerData,
      step_outputs: new Map(),
      current_step: "",
      timestamp: new Date(),
    };

    const stepExecutions: StepExecutionResult[] = [];
    let status: "completed" | "failed" = "completed";
    let finalOutput: any = null;

    try {
      // Topologically sort steps
      const sortedSteps = this.topologicalSort(workflow);

      // Execute each step
      for (const step of sortedSteps) {
        context.current_step = step.id;
        const startTime = Date.now();

        try {
          // Skip step if it's in a false branch
          if (this.shouldSkipStep(step, context, workflow)) {
            stepExecutions.push({
              step_id: step.id,
              status: "skipped",
              duration_ms: 0,
              executed_at: new Date(),
            });
            continue;
          }

          // Execute the step
          const result = await this.executeStep(step, context);

          const duration = Date.now() - startTime;
          stepExecutions.push({
            step_id: step.id,
            status: "success",
            output: result,
            duration_ms: duration,
            executed_at: new Date(),
          });

          // Store output in context
          context.step_outputs.set(step.id, result);
          finalOutput = result;
        } catch (error) {
          status = "failed";
          stepExecutions.push({
            step_id: step.id,
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
            duration_ms: Date.now() - startTime,
            executed_at: new Date(),
          });
          break;
        }
      }
    } catch (error) {
      status = "failed";
    }

    return {
      id: executionId,
      workflow_id: workflow.id,
      automation_id: automationId,
      trigger_data: triggerData,
      status,
      step_executions: stepExecutions,
      started_at: new Date(),
      completed_at: new Date(),
      final_output: finalOutput,
    };
  }

  /**
   * Dry-run: execute workflow without persisting results
   */
  static async dryRun(
    workflow: WorkflowDefinition,
    triggerData: Record<string, any>,
    automationId: string
  ): Promise<{ trace: string; final_output?: any; errors: string[] }> {
    const execution = await this.execute(workflow, triggerData, automationId);

    const trace = execution.step_executions
      .map((e) => `${e.step_id}: ${e.status} (${e.duration_ms}ms)`)
      .join("\n");

    const errors = execution.step_executions
      .filter((e) => e.status === "failed" && e.error)
      .map((e) => e.error!);

    return {
      trace,
      final_output: execution.final_output,
      errors,
    };
  }

  /**
   * Topologically sort DAG steps
   */
  private static topologicalSort(workflow: WorkflowDefinition): any[] {
    const sorted: any[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return;
      if (visiting.has(stepId)) {
        throw new Error(`Circular dependency detected at step ${stepId}`);
      }

      visiting.add(stepId);

      const deps = workflow.dependencies.get(stepId) || [];
      for (const dep of deps) {
        visit(dep);
      }

      visiting.delete(stepId);
      visited.add(stepId);

      const step = workflow.steps.find((s) => s.id === stepId);
      if (step) sorted.push(step);
    };

    for (const step of workflow.steps) {
      visit(step.id);
    }

    return sorted;
  }

  /**
   * Check if a step should be skipped (dead branch)
   */
  private static shouldSkipStep(step: any, context: ExecutionContext, workflow: WorkflowDefinition): boolean {
    // Check if this step is reachable from previous decision
    const dependsOn = Array.from(workflow.dependencies.entries())
      .filter(([, deps]) => deps.includes(step.id))
      .map(([stepId]) => stepId);

    for (const depStepId of dependsOn) {
      const depStep = workflow.steps.find((s) => s.id === depStepId);
      if (depStep?.type === "decision" && depStep.condition) {
        const conditionResult = ConditionalEvaluator.evaluate(depStep.condition.expression, context);
        const isOnTrueBranch = depStep.true_branch === step.id;

        if (isOnTrueBranch && !conditionResult) return true;
        if (!isOnTrueBranch && conditionResult) return true;
      }
    }

    return false;
  }

  /**
   * Execute a single step
   */
  private static async executeStep(step: any, context: ExecutionContext): Promise<any> {
    switch (step.type) {
      case "trigger":
        return context.trigger_data;

      case "decision":
        if (!step.condition) throw new Error("Decision step missing condition");
        const result = ConditionalEvaluator.evaluate(step.condition.expression, context);
        return { decision: result, branch: result ? "true" : "false" };

      case "action":
        return await this.executeAction(step, context);

      case "aggregate":
        return this.aggregateOutputs(context);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute an action step (placeholder - would call actual action handler)
   */
  private static async executeAction(step: any, context: ExecutionContext): Promise<any> {
    // This would call the actual action implementation
    // For now, return step config as mock
    return step.config;
  }

  /**
   * Aggregate all previous step outputs
   */
  private static aggregateOutputs(context: ExecutionContext): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [stepId, output] of context.step_outputs.entries()) {
      result[stepId] = output;
    }
    return result;
  }

  /**
   * Validate DAG for cycles
   */
  static validateDAG(workflow: WorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (visited.has(stepId)) return false;
      if (visiting.has(stepId)) return true;

      visiting.add(stepId);
      const deps = workflow.dependencies.get(stepId) || [];
      for (const dep of deps) {
        if (hasCycle(dep)) return true;
      }
      visiting.delete(stepId);
      visited.add(stepId);
      return false;
    };

    for (const step of workflow.steps) {
      if (hasCycle(step.id)) {
        errors.push(`Circular dependency detected at step ${step.id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static generateId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
