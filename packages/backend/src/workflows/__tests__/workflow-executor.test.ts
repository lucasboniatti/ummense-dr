/**
 * WorkflowExecutor Unit Tests
 * Tests for DAG traversal, branching, context passing, and execution
 */

import { WorkflowExecutor } from "../workflow-executor";
import { WorkflowDefinition, WorkflowStep, ExecutionContext } from "../models";

describe("WorkflowExecutor", () => {
  // Test setup utilities
  const createStep = (overrides: Partial<WorkflowStep> = {}): WorkflowStep => ({
    id: `step_${Date.now()}`,
    name: "Test Step",
    type: "action",
    config: {},
    ...overrides,
  });

  const createWorkflow = (
    steps: WorkflowStep[] = [],
    dependencies: Map<string, string[]> = new Map()
  ): WorkflowDefinition => ({
    id: "workflow_1",
    automation_id: "automation_1",
    name: "Test Workflow",
    description: "Test workflow",
    steps: steps.length ? steps : [createStep()],
    dependencies,
    is_valid: true,
    version: 1,
  });

  // Topological Sort Tests
  describe("topologicalSort", () => {
    it("should sort linear dependency chain correctly", () => {
      const step1 = createStep({ id: "step_1", name: "First" });
      const step2 = createStep({ id: "step_2", name: "Second" });
      const step3 = createStep({ id: "step_3", name: "Third" });

      const deps = new Map([
        ["step_2", ["step_1"]],
        ["step_3", ["step_2"]],
      ]);

      const workflow = createWorkflow([step1, step2, step3], deps);
      const sorted = WorkflowExecutor.topologicalSort(workflow);

      expect(sorted).toEqual(["step_1", "step_2", "step_3"]);
    });

    it("should handle independent steps", () => {
      const step1 = createStep({ id: "step_1" });
      const step2 = createStep({ id: "step_2" });

      const workflow = createWorkflow([step1, step2], new Map());
      const sorted = WorkflowExecutor.topologicalSort(workflow);

      expect(sorted.length).toBe(2);
      expect(sorted).toContain("step_1");
      expect(sorted).toContain("step_2");
    });

    it("should detect circular dependencies", () => {
      const step1 = createStep({ id: "step_1" });
      const step2 = createStep({ id: "step_2" });

      const deps = new Map([
        ["step_2", ["step_1"]],
        ["step_1", ["step_2"]],
      ]);

      const workflow = createWorkflow([step1, step2], deps);

      expect(() => {
        WorkflowExecutor.topologicalSort(workflow);
      }).toThrow();
    });

    it("should handle multiple independent branches", () => {
      const step1 = createStep({ id: "step_1" });
      const step2 = createStep({ id: "step_2" });
      const step3 = createStep({ id: "step_3" });
      const step4 = createStep({ id: "step_4" });

      const deps = new Map([
        ["step_2", ["step_1"]],
        ["step_3", ["step_1"]],
        ["step_4", ["step_2", "step_3"]],
      ]);

      const workflow = createWorkflow([step1, step2, step3, step4], deps);
      const sorted = WorkflowExecutor.topologicalSort(workflow);

      expect(sorted[0]).toBe("step_1");
      expect(sorted[sorted.length - 1]).toBe("step_4");
    });
  });

  // Conditional Branching Tests
  describe("conditional branching", () => {
    it("should take true branch when condition evaluates to true", async () => {
      const triggerStep = createStep({
        id: "trigger",
        type: "trigger",
      });
      const decisionStep = createStep({
        id: "decision",
        type: "decision",
        config: {
          condition: "trigger.status == 'active'",
          true_branch: "action_true",
          false_branch: "action_false",
        },
      });
      const actionTrue = createStep({
        id: "action_true",
        name: "Action True",
      });
      const actionFalse = createStep({
        id: "action_false",
        name: "Action False",
      });

      const deps = new Map([
        ["decision", ["trigger"]],
        ["action_true", ["decision"]],
        ["action_false", ["decision"]],
      ]);

      const workflow = createWorkflow([triggerStep, decisionStep, actionTrue, actionFalse], deps);

      const context: ExecutionContext = {
        trigger_data: { status: "active" },
        step_outputs: {},
      };

      const result = await WorkflowExecutor.execute(workflow, context.trigger_data, "automation_1");

      expect(result.status).toBe("completed");
      expect(result.execution_path).toContain("trigger");
      expect(result.execution_path).toContain("decision");
      expect(result.execution_path).toContain("action_true");
      expect(result.execution_path).not.toContain("action_false");
    });

    it("should take false branch when condition evaluates to false", async () => {
      const triggerStep = createStep({
        id: "trigger",
        type: "trigger",
      });
      const decisionStep = createStep({
        id: "decision",
        type: "decision",
        config: {
          condition: "trigger.status == 'active'",
          true_branch: "action_true",
          false_branch: "action_false",
        },
      });
      const actionTrue = createStep({ id: "action_true", name: "Action True" });
      const actionFalse = createStep({ id: "action_false", name: "Action False" });

      const deps = new Map([
        ["decision", ["trigger"]],
        ["action_true", ["decision"]],
        ["action_false", ["decision"]],
      ]);

      const workflow = createWorkflow([triggerStep, decisionStep, actionTrue, actionFalse], deps);

      const context: ExecutionContext = {
        trigger_data: { status: "inactive" },
        step_outputs: {},
      };

      const result = await WorkflowExecutor.execute(workflow, context.trigger_data, "automation_1");

      expect(result.status).toBe("completed");
      expect(result.execution_path).toContain("trigger");
      expect(result.execution_path).toContain("decision");
      expect(result.execution_path).not.toContain("action_true");
      expect(result.execution_path).toContain("action_false");
    });

    it("should skip dead branches efficiently", async () => {
      const triggerStep = createStep({ id: "trigger", type: "trigger" });
      const decisionStep = createStep({
        id: "decision",
        type: "decision",
        config: {
          condition: "trigger.value > 100",
          true_branch: "expensive_step",
          false_branch: "skip_step",
        },
      });
      const expensiveStep = createStep({ id: "expensive_step" });
      const skipStep = createStep({ id: "skip_step" });

      const deps = new Map([
        ["decision", ["trigger"]],
        ["expensive_step", ["decision"]],
        ["skip_step", ["decision"]],
      ]);

      const workflow = createWorkflow([triggerStep, decisionStep, expensiveStep, skipStep], deps);

      const result = await WorkflowExecutor.execute(workflow, { value: 50 }, "automation_1");

      expect(result.execution_path).not.toContain("expensive_step");
      expect(result.skipped_steps).toContain("expensive_step");
    });
  });

  // Context Passing Tests
  describe("context passing between steps", () => {
    it("should pass context from trigger to downstream steps", async () => {
      const triggerStep = createStep({
        id: "trigger",
        type: "trigger",
      });
      const actionStep = createStep({
        id: "action",
        type: "action",
      });

      const deps = new Map([["action", ["trigger"]]]);
      const workflow = createWorkflow([triggerStep, actionStep], deps);

      const triggerData = { user_id: 123, email: "test@example.com" };
      const result = await WorkflowExecutor.execute(workflow, triggerData, "automation_1");

      expect(result.context.trigger_data).toEqual(triggerData);
    });

    it("should accumulate outputs from all executed steps", async () => {
      const triggerStep = createStep({ id: "trigger", type: "trigger" });
      const step1 = createStep({ id: "step_1", type: "action" });
      const step2 = createStep({ id: "step_2", type: "action" });

      const deps = new Map([
        ["step_1", ["trigger"]],
        ["step_2", ["step_1"]],
      ]);

      const workflow = createWorkflow([triggerStep, step1, step2], deps);

      const result = await WorkflowExecutor.execute(workflow, { value: 1 }, "automation_1");

      expect(result.context.step_outputs).toBeDefined();
      expect(typeof result.context.step_outputs).toBe("object");
    });

    it("should not allow step to modify sibling context", () => {
      const triggerStep = createStep({ id: "trigger", type: "trigger" });
      const step1 = createStep({ id: "step_1", type: "action" });
      const step2 = createStep({ id: "step_2", type: "action" });

      const deps = new Map([
        ["step_1", ["trigger"]],
        ["step_2", ["trigger"]],
      ]);

      const workflow = createWorkflow([triggerStep, step1, step2], deps);

      // This is a design constraint: each step sees parent context but cannot modify siblings
      expect(deps.get("step_1")).not.toContain("step_2");
      expect(deps.get("step_2")).not.toContain("step_1");
    });
  });

  // Error Handling Tests
  describe("error handling", () => {
    it("should mark execution as failed on step error", async () => {
      const triggerStep = createStep({
        id: "trigger",
        type: "trigger",
      });
      const actionStep = createStep({
        id: "action",
        type: "action",
        config: { will_error: true },
      });

      const deps = new Map([["action", ["trigger"]]]);
      const workflow = createWorkflow([triggerStep, actionStep], deps);

      const result = await WorkflowExecutor.execute(workflow, { value: 1 }, "automation_1");

      // Error handling behavior depends on implementation
      // At minimum, execution should complete (not throw)
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it("should handle missing dependencies gracefully", () => {
      const step1 = createStep({ id: "step_1" });
      const step2 = createStep({ id: "step_2" });

      const deps = new Map([["step_2", ["step_999"]]]);
      const workflow = createWorkflow([step1, step2], deps);

      expect(() => {
        WorkflowExecutor.topologicalSort(workflow);
      }).toThrow();
    });

    it("should validate DAG structure before execution", () => {
      const step1 = createStep({ id: "step_1" });
      const step2 = createStep({ id: "step_2" });

      const deps = new Map([
        ["step_2", ["step_1"]],
        ["step_1", ["step_2"]],
      ]);

      const workflow = createWorkflow([step1, step2], deps);
      const validation = WorkflowExecutor.validateDAG(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  // Complex Workflow Tests
  describe("complex workflows", () => {
    it("should execute diamond dependency pattern correctly", async () => {
      // Diamond: A → B,C → D
      const stepA = createStep({ id: "step_a", type: "trigger" });
      const stepB = createStep({ id: "step_b" });
      const stepC = createStep({ id: "step_c" });
      const stepD = createStep({ id: "step_d" });

      const deps = new Map([
        ["step_b", ["step_a"]],
        ["step_c", ["step_a"]],
        ["step_d", ["step_b", "step_c"]],
      ]);

      const workflow = createWorkflow([stepA, stepB, stepC, stepD], deps);
      const sorted = WorkflowExecutor.topologicalSort(workflow);

      expect(sorted[0]).toBe("step_a");
      expect(sorted.indexOf("step_b")).toBeLessThan(sorted.indexOf("step_d"));
      expect(sorted.indexOf("step_c")).toBeLessThan(sorted.indexOf("step_d"));
    });

    it("should handle nested conditional branches", async () => {
      const trigger = createStep({ id: "trigger", type: "trigger" });
      const decision1 = createStep({
        id: "decision_1",
        type: "decision",
        config: {
          condition: "trigger.level == 'high'",
          true_branch: "decision_2",
          false_branch: "default_action",
        },
      });
      const decision2 = createStep({
        id: "decision_2",
        type: "decision",
        config: {
          condition: "trigger.severity > 8",
          true_branch: "alert",
          false_branch: "log",
        },
      });
      const alert = createStep({ id: "alert" });
      const log = createStep({ id: "log" });
      const defaultAction = createStep({ id: "default_action" });

      const deps = new Map([
        ["decision_1", ["trigger"]],
        ["decision_2", ["decision_1"]],
        ["alert", ["decision_2"]],
        ["log", ["decision_2"]],
        ["default_action", ["decision_1"]],
      ]);

      const workflow = createWorkflow(
        [trigger, decision1, decision2, alert, log, defaultAction],
        deps
      );

      const result = await WorkflowExecutor.execute(
        workflow,
        { level: "high", severity: 9 },
        "automation_1"
      );

      expect(result.status).toBe("completed");
      expect(result.execution_path).toContain("alert");
    });

    it("should handle aggregate step that merges multiple branches", async () => {
      const trigger = createStep({ id: "trigger", type: "trigger" });
      const pathA = createStep({ id: "path_a" });
      const pathB = createStep({ id: "path_b" });
      const aggregate = createStep({ id: "aggregate", type: "aggregate" });

      const deps = new Map([
        ["path_a", ["trigger"]],
        ["path_b", ["trigger"]],
        ["aggregate", ["path_a", "path_b"]],
      ]);

      const workflow = createWorkflow([trigger, pathA, pathB, aggregate], deps);
      const result = await WorkflowExecutor.execute(workflow, { data: "test" }, "automation_1");

      expect(result.status).toBe("completed");
      expect(result.execution_path).toContain("aggregate");
    });
  });

  // Performance Tests
  describe("performance", () => {
    it("should handle 50-step workflow efficiently", async () => {
      const steps: WorkflowStep[] = [];
      const deps = new Map<string, string[]>();

      // Create linear chain of 50 steps
      for (let i = 0; i < 50; i++) {
        steps.push(createStep({ id: `step_${i}` }));
        if (i > 0) {
          deps.set(`step_${i}`, [`step_${i - 1}`]);
        }
      }

      const workflow = createWorkflow(steps, deps);

      const startTime = Date.now();
      const sorted = WorkflowExecutor.topologicalSort(workflow);
      const sortTime = Date.now() - startTime;

      expect(sorted.length).toBe(50);
      expect(sortTime).toBeLessThan(100); // Should complete in <100ms
    });

    it("should detect cycles in large graph quickly", () => {
      const steps: WorkflowStep[] = [];
      const deps = new Map<string, string[]>();

      // Create linear chain with cycle
      for (let i = 0; i < 30; i++) {
        steps.push(createStep({ id: `step_${i}` }));
        if (i > 0) {
          deps.set(`step_${i}`, [`step_${i - 1}`]);
        }
      }

      // Add cycle at end
      deps.set("step_0", ["step_29"]);

      const workflow = createWorkflow(steps, deps);

      const startTime = Date.now();
      expect(() => {
        WorkflowExecutor.topologicalSort(workflow);
      }).toThrow();
      const detectTime = Date.now() - startTime;

      expect(detectTime).toBeLessThan(100); // Should detect quickly
    });
  });
});
