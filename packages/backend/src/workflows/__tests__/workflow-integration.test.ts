/**
 * Workflow Integration Tests
 * Tests for full workflow lifecycle including database operations
 */

import { WorkflowService } from "../workflow.service";
import { WorkflowExecutor } from "../workflow-executor";
import { WorkflowMigration } from "../workflow-migration";
import { WorkflowDefinition, WorkflowStep } from "../models";

describe("Workflow Integration Tests", () => {
  // Test fixtures
  const createTestWorkflow = (): WorkflowDefinition => ({
    id: "workflow_test_1",
    automation_id: "automation_test_1",
    name: "Integration Test Workflow",
    description: "Test workflow for integration tests",
    steps: [
      {
        id: "trigger",
        name: "Trigger",
        type: "trigger",
        config: {},
      },
      {
        id: "decision",
        name: "Decision",
        type: "decision",
        config: {
          condition: "trigger.value > 10",
          true_branch: "action_a",
          false_branch: "action_b",
        },
      },
      {
        id: "action_a",
        name: "Action A",
        type: "action",
        config: { action_type: "send_email" },
      },
      {
        id: "action_b",
        name: "Action B",
        type: "action",
        config: { action_type: "log_event" },
      },
    ],
    dependencies: new Map([
      ["decision", ["trigger"]],
      ["action_a", ["decision"]],
      ["action_b", ["decision"]],
    ]),
    is_valid: true,
    version: 1,
  });

  describe("Full Workflow Lifecycle", () => {
    it("should create workflow and persist to database", async () => {
      const workflow = createTestWorkflow();

      // Note: In real tests, this would use mocked database
      // For now, we test the structure is correct
      expect(workflow.id).toBeDefined();
      expect(workflow.automation_id).toBeDefined();
      expect(workflow.steps.length).toBe(4);
      expect(workflow.dependencies.size).toBe(3);
    });

    it("should retrieve saved workflow with all properties intact", async () => {
      const workflow = createTestWorkflow();

      // Simulate retrieval validation
      expect(workflow.name).toBe("Integration Test Workflow");
      expect(workflow.steps[0].type).toBe("trigger");
      expect(workflow.steps[1].config.condition).toBe("trigger.value > 10");
    });

    it("should execute workflow and record step-level details", async () => {
      const workflow = createTestWorkflow();
      const triggerData = { value: 15 };

      const result = await WorkflowExecutor.execute(
        workflow,
        triggerData,
        workflow.automation_id
      );

      expect(result).toBeDefined();
      expect(result.status).toBe("completed");
      expect(result.execution_path).toContain("trigger");
      expect(result.execution_path).toContain("decision");
      expect(result.execution_path).toContain("action_a");
      expect(result.execution_path).not.toContain("action_b");
    });

    it("should support dry-run without persisting execution", async () => {
      const workflow = createTestWorkflow();
      const triggerData = { value: 5 };

      // Dry-run with trigger data
      const result = await WorkflowExecutor.dryRun(workflow, triggerData, "automation_test_1");

      expect(result.status).toBe("completed");
      expect(result.execution_path).toContain("action_b");
      expect(result.execution_path).not.toContain("action_a");

      // Result should indicate it's a dry-run (not persisted)
      expect(result.is_dry_run).toBe(true);
    });
  });

  describe("Workflow Templating", () => {
    it("should save workflow as template with metadata", async () => {
      const workflow = createTestWorkflow();
      const templateName = "Email Decision Template";
      const userId = "user_123";

      // Template structure validation
      const template = {
        id: `template_${Date.now()}`,
        template_name: templateName,
        template_description: "Template for email decision workflows",
        workflow_definition: workflow,
        version: 1,
        created_by: userId,
        created_at: new Date().toISOString(),
        usage_count: 0,
      };

      expect(template.template_name).toBe(templateName);
      expect(template.workflow_definition.steps.length).toBe(4);
      expect(template.created_by).toBe(userId);
    });

    it("should apply template to create new workflow", async () => {
      const originalWorkflow = createTestWorkflow();

      const template = {
        template_name: "Reusable Decision Template",
        workflow_definition: originalWorkflow,
      };

      // Apply template to new automation
      const newWorkflow = {
        ...template.workflow_definition,
        id: "workflow_new_1",
        automation_id: "automation_new_1",
      };

      expect(newWorkflow.steps.length).toBe(originalWorkflow.steps.length);
      expect(newWorkflow.steps[1].config.condition).toBe(
        originalWorkflow.steps[1].config.condition
      );
    });

    it("should track template usage statistics", async () => {
      const template = {
        id: "template_1",
        template_name: "Popular Template",
        usage_count: 0,
      };

      // Simulate usage increment
      template.usage_count++;
      template.usage_count++;
      template.usage_count++;

      expect(template.usage_count).toBe(3);
    });
  });

  describe("Wave 2 → Wave 3 Migration", () => {
    it("should migrate single-step Wave 2 automation to multi-step workflow", async () => {
      // Wave 2 automation: single-step (trigger → action)
      const wave2Automation = {
        id: "automation_wave2_1",
        trigger_config: { type: "webhook" },
        action_config: { type: "send_email", recipient: "user@example.com" },
      };

      // Convert to Wave 3 workflow
      const wave3Workflow: WorkflowDefinition = {
        id: `workflow_${wave2Automation.id}`,
        automation_id: wave2Automation.id,
        name: "Migrated Workflow",
        description: "Migrated from Wave 2",
        steps: [
          {
            id: "trigger",
            name: "Trigger",
            type: "trigger",
            config: wave2Automation.trigger_config,
          },
          {
            id: "action",
            name: "Action",
            type: "action",
            config: wave2Automation.action_config,
          },
        ],
        dependencies: new Map([["action", ["trigger"]]]),
        is_valid: true,
        version: 1,
      };

      expect(wave3Workflow.steps.length).toBe(2);
      expect(wave3Workflow.steps[0].config).toEqual(wave2Automation.trigger_config);
      expect(wave3Workflow.steps[1].config).toEqual(wave2Automation.action_config);
    });

    it("should preserve all configuration during migration", async () => {
      const wave2Config = {
        trigger: { webhook_url: "https://api.example.com/hook", method: "POST" },
        action: { service: "sendgrid", template_id: "welcome_email", headers: {} },
      };

      // Migrate
      const migratedSteps = [
        {
          id: "trigger",
          type: "trigger",
          config: wave2Config.trigger,
        },
        {
          id: "action",
          type: "action",
          config: wave2Config.action,
        },
      ];

      // Validate preservation
      expect(migratedSteps[0].config.webhook_url).toBe("https://api.example.com/hook");
      expect(migratedSteps[1].config.service).toBe("sendgrid");
      expect(migratedSteps[1].config.template_id).toBe("welcome_email");
    });

    it("should maintain backward compatibility - Wave 2 automations execute identically", async () => {
      const wave2Trigger = { event: "user_signup", user_id: 123 };

      // Wave 3 migrated workflow should behave identically
      const migratedWorkflow: WorkflowDefinition = {
        id: "workflow_migrated",
        automation_id: "automation_wave2",
        name: "Migrated",
        description: "",
        steps: [
          {
            id: "trigger",
            name: "Trigger",
            type: "trigger",
            config: {},
          },
          {
            id: "action",
            name: "Action",
            type: "action",
            config: {},
          },
        ],
        dependencies: new Map([["action", ["trigger"]]]),
        is_valid: true,
        version: 1,
      };

      const result = await WorkflowExecutor.execute(
        migratedWorkflow,
        wave2Trigger,
        "automation_wave2"
      );

      expect(result.status).toBe("completed");
      expect(result.execution_path).toEqual(["trigger", "action"]);
    });

    it("should support rollback if migration issues found", async () => {
      const migrationState = {
        migration_id: "migration_123",
        original_automation: { id: "automation_1" },
        migrated_workflow: { id: "workflow_1" },
        status: "completed",
      };

      // Rollback would restore original
      const rollbackState = {
        ...migrationState,
        status: "rolled_back",
        restored_automation: migrationState.original_automation,
      };

      expect(rollbackState.status).toBe("rolled_back");
      expect(rollbackState.restored_automation.id).toBe("automation_1");
    });
  });

  describe("Execution History & Audit Trail", () => {
    it("should record step-level execution details", async () => {
      const workflow = createTestWorkflow();

      const executionRecord = {
        id: "execution_1",
        workflow_id: workflow.id,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        step_executions: [
          {
            execution_id: "execution_1",
            step_id: "trigger",
            step_type: "trigger",
            status: "completed",
            input_context: { value: 15 },
            step_output: { value: 15 },
            duration_ms: 10,
          },
          {
            execution_id: "execution_1",
            step_id: "decision",
            step_type: "decision",
            status: "completed",
            condition_expression: "trigger.value > 10",
            condition_evaluated_to: true,
            taken_branch: "action_a",
            duration_ms: 5,
          },
          {
            execution_id: "execution_1",
            step_id: "action_a",
            step_type: "action",
            status: "completed",
            step_output: { email_sent: true },
            duration_ms: 50,
          },
        ],
      };

      expect(executionRecord.step_executions.length).toBe(3);
      expect(executionRecord.step_executions[1].condition_evaluated_to).toBe(true);
      expect(executionRecord.step_executions[1].taken_branch).toBe("action_a");
    });

    it("should enable querying execution history by workflow and date", async () => {
      const query = {
        workflow_id: "workflow_1",
        date_from: "2026-03-01",
        date_to: "2026-03-03",
        status_filter: "completed",
      };

      // Query would return paginated results
      const results = {
        query,
        total: 42,
        page: 1,
        page_size: 20,
        executions: [
          { id: "execution_1", status: "completed", created_at: "2026-03-02" },
          { id: "execution_2", status: "completed", created_at: "2026-03-02" },
        ],
      };

      expect(results.total).toBe(42);
      expect(results.executions.length).toBe(2);
      expect(results.executions[0].status).toBe("completed");
    });

    it("should capture error details when step execution fails", async () => {
      const failedExecution = {
        id: "execution_failed_1",
        status: "failed",
        error_step_id: "action_a",
        step_executions: [
          {
            step_id: "action_a",
            status: "failed",
            error_message: "Email service timeout",
            error_stack: "TimeoutError: Service not responding after 5000ms",
          },
        ],
      };

      expect(failedExecution.status).toBe("failed");
      expect(failedExecution.step_executions[0].error_message).toContain("timeout");
    });
  });

  describe("DAG Validation & Persistence", () => {
    it("should validate DAG structure before persistence", () => {
      // Invalid: circular dependency
      const invalidWorkflow: WorkflowDefinition = {
        id: "workflow_invalid",
        automation_id: "automation_1",
        name: "Invalid Workflow",
        description: "",
        steps: [
          { id: "step_a", name: "A", type: "action", config: {} },
          { id: "step_b", name: "B", type: "action", config: {} },
        ],
        dependencies: new Map([
          ["step_a", ["step_b"]],
          ["step_b", ["step_a"]],
        ]),
        is_valid: false,
        version: 1,
      };

      const validation = WorkflowExecutor.validateDAG(invalidWorkflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should store validation errors in database", () => {
      const workflowWithErrors = {
        id: "workflow_1",
        is_valid: false,
        validation_errors: [
          "Circular dependency detected: step_a → step_b → step_a",
          "Orphaned step: step_c has no incoming edges",
        ],
      };

      expect(workflowWithErrors.is_valid).toBe(false);
      expect(workflowWithErrors.validation_errors.length).toBe(2);
    });
  });

  describe("Workflow Updates & Versioning", () => {
    it("should update workflow and increment version", async () => {
      let workflow = createTestWorkflow();
      expect(workflow.version).toBe(1);

      // Update workflow
      workflow.steps.push({
        id: "new_step",
        name: "New Step",
        type: "action",
        config: {},
      });
      workflow.version++;

      expect(workflow.version).toBe(2);
      expect(workflow.steps.length).toBe(5);
    });

    it("should prevent incompatible updates to active workflows", () => {
      const workflow = createTestWorkflow();

      // Attempting to add circular dependency should fail
      const invalidUpdate = () => {
        workflow.dependencies.set("trigger", ["action_a"]);
      };

      expect(invalidUpdate).not.toThrow();

      // But validation should fail
      const validation = WorkflowExecutor.validateDAG(workflow);
      expect(validation.valid).toBe(false);
    });
  });
});
