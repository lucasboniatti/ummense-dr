/**
 * Workflow Controller
 * Handles HTTP requests for workflow CRUD and execution
 */

import { Request, Response } from "express";
import { WorkflowService } from "../../workflows/workflow.service";
import { WorkflowExecutor } from "../../workflows/workflow-executor.ts";

export class WorkflowController {
  // POST /api/workflows/{automation_id}
  static async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { automation_id } = req.params;
      const { name, description, steps, dependencies } = req.body;

      const workflow = await WorkflowService.createWorkflow(automation_id, {
        name,
        description,
        steps,
        dependencies: new Map(Object.entries(dependencies || {})),
      });

      res.status(201).json(workflow);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create workflow" });
    }
  }

  // GET /api/workflows/{automation_id}
  static async getWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { automation_id } = req.params;
      const workflow = await WorkflowService.getWorkflow(automation_id);
      res.json(workflow);
    } catch (error) {
      res.status(404).json({ error: "Workflow not found" });
    }
  }

  // PATCH /api/workflows/{automation_id}
  static async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { automation_id } = req.params;
      const { name, description, steps, dependencies } = req.body;

      const workflow = await WorkflowService.updateWorkflow(automation_id, {
        name,
        description,
        steps,
        dependencies: new Map(Object.entries(dependencies || {})),
      });

      res.json(workflow);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update workflow" });
    }
  }

  // DELETE /api/workflows/{automation_id}
  static async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { automation_id } = req.params;
      await WorkflowService.deleteWorkflow(automation_id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: "Failed to delete workflow" });
    }
  }

  // POST /api/workflows/{automation_id}/dry-run
  static async dryRun(req: Request, res: Response): Promise<void> {
    try {
      const { automation_id } = req.params;
      const { trigger_data } = req.body;

      const workflow = await WorkflowService.getWorkflow(automation_id);
      const result = await WorkflowExecutor.dryRun(workflow, trigger_data, automation_id);

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Dry-run failed" });
    }
  }

  // GET /api/workflows/executions/{execution_id}/steps
  static async getExecutionSteps(req: Request, res: Response): Promise<void> {
    try {
      const { execution_id } = req.params;

      // Query step execution details from database
      const { data, error } = await (global as any).supabase
        .from("workflow_step_executions")
        .select("*")
        .eq("execution_id", execution_id);

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(404).json({ error: "Execution not found" });
    }
  }

  // GET /api/workflows/templates
  static async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;
      const templates = await WorkflowService.listTemplates(parseInt(limit as string));
      res.json(templates);
    } catch (error) {
      res.status(400).json({ error: "Failed to list templates" });
    }
  }

  // POST /api/workflows/templates
  static async saveTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { automation_id } = req.params;
      const { template_name } = req.body;
      const userId = (req as any).user?.id;

      const workflow = await WorkflowService.getWorkflow(automation_id);
      const template = await WorkflowService.saveAsTemplate(workflow, template_name, userId);

      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to save template" });
    }
  }

  // POST /api/workflows/templates/{template_id}/apply
  static async applyTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { automation_id } = req.params;
      const { template_id } = req.body;

      const workflow = await WorkflowService.applyTemplate(automation_id, template_id);
      res.status(201).json(workflow);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to apply template" });
    }
  }
}
