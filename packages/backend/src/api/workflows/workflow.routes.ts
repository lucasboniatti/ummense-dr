/**
 * Workflow Routes
 */

import { Router } from "express";
import { WorkflowController } from "./workflow.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

// Middleware
router.use(authenticate);

// Workflow CRUD
router.post("/:automation_id", WorkflowController.createWorkflow);
router.get("/:automation_id", WorkflowController.getWorkflow);
router.patch("/:automation_id", WorkflowController.updateWorkflow);
router.delete("/:automation_id", WorkflowController.deleteWorkflow);

// Dry-run execution
router.post("/:automation_id/dry-run", WorkflowController.dryRun);

// Execution details
router.get("/executions/:execution_id/steps", WorkflowController.getExecutionSteps);

// Templates
router.get("/templates", WorkflowController.listTemplates);
router.post("/:automation_id/templates", WorkflowController.saveTemplate);
router.post("/:automation_id/templates/:template_id/apply", WorkflowController.applyTemplate);

export default router;
