/**
 * Workflow Service
 * CRUD operations for workflow definitions
 */

import { supabase } from "../lib/supabase";
import { WorkflowDefinition, WorkflowTemplate } from "./models";
import { WorkflowExecutor } from "./workflow-executor";

export class WorkflowService {
  /**
   * Create a new workflow
   */
  static async createWorkflow(automationId: string, workflow: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    const validation = WorkflowExecutor.validateDAG(workflow as WorkflowDefinition);
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.errors.join(", ")}`);
    }

    const { data, error } = await supabase
      .from("workflow_definitions")
      .insert({
        automation_id: automationId,
        workflow_name: workflow.name || "Untitled Workflow",
        workflow_description: workflow.description,
        dag_structure: JSON.stringify(workflow.steps || []),
        dependencies: JSON.stringify(Object.fromEntries(workflow.dependencies || new Map())),
        is_valid: validation.valid,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get workflow definition
   */
  static async getWorkflow(automationId: string): Promise<WorkflowDefinition> {
    const { data, error } = await supabase
      .from("workflow_definitions")
      .select("*")
      .eq("automation_id", automationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return {
      ...data,
      steps: JSON.parse(data.dag_structure),
      dependencies: new Map(Object.entries(JSON.parse(data.dependencies || "{}"))),
    };
  }

  /**
   * Update workflow
   */
  static async updateWorkflow(automationId: string, workflow: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    const validation = WorkflowExecutor.validateDAG(workflow as WorkflowDefinition);

    const { data, error } = await supabase
      .from("workflow_definitions")
      .update({
        workflow_name: workflow.name,
        workflow_description: workflow.description,
        dag_structure: JSON.stringify(workflow.steps),
        dependencies: JSON.stringify(Object.fromEntries(workflow.dependencies || new Map())),
        is_valid: validation.valid,
        validation_errors: validation.errors,
      })
      .eq("automation_id", automationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete workflow
   */
  static async deleteWorkflow(automationId: string): Promise<void> {
    const { error } = await supabase.from("workflow_definitions").delete().eq("automation_id", automationId);
    if (error) throw error;
  }

  /**
   * Save workflow as template
   */
  static async saveAsTemplate(workflow: WorkflowDefinition, templateName: string, userId: string): Promise<WorkflowTemplate> {
    const { data, error } = await supabase
      .from("workflow_templates")
      .insert({
        template_name: templateName,
        template_description: workflow.description,
        workflow_definition: JSON.stringify({
          steps: workflow.steps,
          dependencies: Object.fromEntries(workflow.dependencies),
        }),
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Load template
   */
  static async loadTemplate(templateId: string): Promise<WorkflowTemplate> {
    const { data, error } = await supabase
      .from("workflow_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * List templates
   */
  static async listTemplates(limit: number = 20): Promise<WorkflowTemplate[]> {
    const { data, error } = await supabase
      .from("workflow_templates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Apply template to create new workflow
   */
  static async applyTemplate(automationId: string, templateId: string): Promise<WorkflowDefinition> {
    const template = await this.loadTemplate(templateId);
    const workflowDef = JSON.parse(template.workflow_definition);

    return this.createWorkflow(automationId, {
      name: `${template.template_name} (Copy)`,
      description: template.template_description,
      steps: workflowDef.steps,
      dependencies: new Map(Object.entries(workflowDef.dependencies)),
    });
  }
}
