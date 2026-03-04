/**
 * Wave 2 to Wave 3 Migration
 * Converts single-step Wave 2 automations to multi-step workflow format
 */

import { WorkflowDefinition } from "./models";

export class WorkflowMigration {
  /**
   * Migrate Wave 2 automation to Wave 3 workflow
   * Wave 2: Simple trigger -> action model
   * Wave 3: DAG with multiple steps and conditional branching
   */
  static migrateFromWave2(wave2Automation: any): WorkflowDefinition {
    // Convert Wave 2 structure to Wave 3
    const steps: WorkflowDefinition['steps'] = [
      {
        id: "step-trigger",
        type: "trigger",
        name: "Trigger Data",
        config: wave2Automation.trigger || {},
      },
      {
        id: "step-action",
        type: "action",
        name: wave2Automation.name || "Action",
        config: wave2Automation.action || {},
      },
    ];

    const dependencies = new Map<string, string[]>([
      ["step-trigger", []],
      ["step-action", ["step-trigger"]],
    ]);

    return {
      id: `workflow-${wave2Automation.id}`,
      name: wave2Automation.name || "Migrated Workflow",
      description: `Migrated from Wave 2 automation`,
      steps,
      dependencies,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Migrate multiple Wave 2 automations
   */
  static migrateMultiple(wave2Automations: any[]): WorkflowDefinition[] {
    return wave2Automations.map((auto) => this.migrateFromWave2(auto));
  }

  /**
   * Validate migration (ensure no data loss)
   */
  static validateMigration(original: any, migrated: WorkflowDefinition): boolean {
    // Check that trigger and action data are preserved
    const triggerStep = migrated.steps.find((s) => s.type === "trigger");
    const actionStep = migrated.steps.find((s) => s.type === "action");

    if (!triggerStep || !actionStep) return false;

    // Verify trigger config matches
    if (JSON.stringify(triggerStep.config) !== JSON.stringify(original.trigger || {})) {
      return false;
    }

    // Verify action config matches
    if (JSON.stringify(actionStep.config) !== JSON.stringify(original.action || {})) {
      return false;
    }

    return true;
  }

  /**
   * Rollback: convert Wave 3 workflow back to Wave 2 (if needed)
   */
  static rollbackToWave2(workflow: WorkflowDefinition): any {
    const triggerStep = workflow.steps.find((s) => s.type === "trigger");
    const actionStep = workflow.steps.find((s) => s.type === "action");

    if (!triggerStep || !actionStep) {
      throw new Error("Cannot rollback: workflow structure invalid");
    }

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      trigger: triggerStep.config,
      action: actionStep.config,
    };
  }
}
