/**
 * Workflow Builder Component
 * Main integration component coordinating all workflow editing features
 */

import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { WorkflowDefinition, WorkflowStep, WorkflowTemplate } from "../../types";
import { DAGVisualization } from "./DAGVisualization";
import { ConditionalBranch } from "./ConditionalBranch";
import { WorkflowTemplateManager } from "./WorkflowTemplateManager";

interface WorkflowBuilderProps {
  automationId: string;
  initialWorkflow?: WorkflowDefinition;
  onWorkflowChange?: (workflow: WorkflowDefinition) => void;
  onSave?: (workflow: WorkflowDefinition) => void;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  automationId,
  initialWorkflow,
  onWorkflowChange,
  onSave,
}) => {
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(initialWorkflow || null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [showDryRunInput, setShowDryRunInput] = useState(false);
  const [dryRunData, setDryRunData] = useState<string>("{}");

  useEffect(() => {
    if (!workflow) {
      loadWorkflow();
    }
  }, [automationId]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/workflows/${automationId}`);
      setWorkflow(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load workflow");
    } finally {
      setLoading(false);
    }
  };

  const handleStepSelect = (stepId: string) => {
    setSelectedStepId(stepId);
  };

  const handleStepAdd = (position: { x: number; y: number }) => {
    if (!workflow) return;

    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: `Step ${workflow.steps.length + 1}`,
      type: "action",
      config: {},
    };

    const updatedWorkflow = {
      ...workflow,
      steps: [...workflow.steps, newStep],
    };

    setWorkflow(updatedWorkflow);
    onWorkflowChange?.(updatedWorkflow);
  };

  const handleStepDelete = (stepId: string) => {
    if (!workflow) return;

    const updatedWorkflow = {
      ...workflow,
      steps: workflow.steps.filter((s) => s.id !== stepId),
      dependencies: new Map(
        Array.from(workflow.dependencies.entries()).filter(
          ([key, deps]) => key !== stepId && !deps.includes(stepId)
        )
      ),
    };

    setWorkflow(updatedWorkflow);
    setSelectedStepId(null);
    onWorkflowChange?.(updatedWorkflow);
  };

  const handleConditionalChange = (stepId: string, updates: Partial<any>) => {
    if (!workflow) return;

    const updatedSteps = workflow.steps.map((step) =>
      step.id === stepId ? { ...step, ...updates } : step
    );

    const updatedWorkflow = {
      ...workflow,
      steps: updatedSteps,
    };

    setWorkflow(updatedWorkflow);
    onWorkflowChange?.(updatedWorkflow);
  };

  const handleSaveWorkflow = async () => {
    if (!workflow) return;

    try {
      setSaving(true);
      await api.post(`/workflows/${automationId}`, {
        name: workflow.name,
        description: workflow.description,
        steps: workflow.steps,
        dependencies: Object.fromEntries(workflow.dependencies),
      });

      setError(null);
      onSave?.(workflow);
    } catch (err) {
      setError("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  const handleDryRun = async () => {
    if (!workflow) return;

    try {
      setLoading(true);
      const trigger_data = JSON.parse(dryRunData);

      const response = await api.post(`/workflows/${automationId}/dry-run`, {
        trigger_data,
      });

      setDryRunResult(response.data);
      setError(null);
    } catch (err) {
      setError("Dry-run failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = (template: WorkflowTemplate) => {
    if (template.workflow_definition) {
      const loadedWorkflow = {
        ...workflow,
        ...template.workflow_definition,
      } as WorkflowDefinition;
      setWorkflow(loadedWorkflow);
      onWorkflowChange?.(loadedWorkflow);
    }
  };

  if (loading && !workflow) {
    return <div className="workflow-builder">Loading workflow...</div>;
  }

  if (!workflow) {
    return <div className="workflow-builder">No workflow found</div>;
  }

  const selectedStep = selectedStepId ? workflow.steps.find((s) => s.id === selectedStepId) : null;

  return (
    <div className="workflow-builder">
      <div className="workflow-header">
        <h2>{workflow.name || "Workflow Builder"}</h2>
        <div className="workflow-actions">
          <button onClick={handleSaveWorkflow} disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Workflow"}
          </button>
          <button onClick={() => setShowDryRunInput(!showDryRunInput)} className="btn-secondary">
            Dry Run
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="workflow-content">
        <div className="workflow-canvas">
          <h3>Workflow Diagram</h3>
          <DAGVisualization
            workflow={workflow}
            onStepSelect={handleStepSelect}
            onStepAdd={handleStepAdd}
            onStepDelete={handleStepDelete}
          />
        </div>

        <div className="workflow-panel">
          {selectedStep ? (
            <div className="step-editor">
              <h3>Edit Step: {selectedStep.name}</h3>

              <div className="form-group">
                <label htmlFor="step-name">Step Name:</label>
                <input
                  id="step-name"
                  type="text"
                  value={selectedStep.name}
                  onChange={(e) =>
                    handleConditionalChange(selectedStep.id, { name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="step-type">Step Type:</label>
                <select
                  id="step-type"
                  value={selectedStep.type}
                  onChange={(e) =>
                    handleConditionalChange(selectedStep.id, { type: e.target.value })
                  }
                >
                  <option value="trigger">Trigger</option>
                  <option value="action">Action</option>
                  <option value="decision">Decision</option>
                  <option value="aggregate">Aggregate</option>
                </select>
              </div>

              {selectedStep.type === "decision" && (
                <ConditionalBranch
                  expression={selectedStep.config?.condition || ""}
                  onExpressionChange={(expr) =>
                    handleConditionalChange(selectedStep.id, {
                      config: { ...selectedStep.config, condition: expr },
                    })
                  }
                  onTrueBranchChange={(stepId) =>
                    handleConditionalChange(selectedStep.id, {
                      config: { ...selectedStep.config, true_branch: stepId },
                    })
                  }
                  onFalseBranchChange={(stepId) =>
                    handleConditionalChange(selectedStep.id, {
                      config: { ...selectedStep.config, false_branch: stepId },
                    })
                  }
                  trueBranchStepId={selectedStep.config?.true_branch}
                  falseBranchStepId={selectedStep.config?.false_branch}
                  availableSteps={workflow.steps.filter((s) => s.id !== selectedStep.id)}
                />
              )}
            </div>
          ) : (
            <div className="empty-panel">
              <p>Select a step to edit or click on the canvas to add a new step</p>
            </div>
          )}

          <WorkflowTemplateManager automationId={automationId} onLoadTemplate={handleLoadTemplate} />
        </div>
      </div>

      {showDryRunInput && (
        <div className="dry-run-panel">
          <h3>Dry Run Test</h3>
          <div className="form-group">
            <label htmlFor="trigger-data">Trigger Data (JSON):</label>
            <textarea
              id="trigger-data"
              value={dryRunData}
              onChange={(e) => setDryRunData(e.target.value)}
              placeholder='{"key": "value"}'
              rows={4}
            />
          </div>
          <button onClick={handleDryRun} disabled={loading} className="btn-primary">
            {loading ? "Running..." : "Execute Dry Run"}
          </button>

          {dryRunResult && (
            <div className="dry-run-result">
              <h4>Execution Result:</h4>
              <pre>{JSON.stringify(dryRunResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
