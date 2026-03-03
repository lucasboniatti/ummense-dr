/**
 * Workflow Template Manager Component
 * Save/load workflow templates
 */

import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { WorkflowTemplate } from "../../types";

interface WorkflowTemplateManagerProps {
  automationId: string;
  onLoadTemplate: (template: WorkflowTemplate) => void;
}

export const WorkflowTemplateManager: React.FC<WorkflowTemplateManagerProps> = ({
  automationId,
  onLoadTemplate,
}) => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get("/workflows/templates");
      setTemplates(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;

    try {
      await api.post(`/workflows/${automationId}/templates`, {
        template_name: templateName,
      });

      setTemplateName("");
      setShowSaveDialog(false);
      await loadTemplates();
    } catch (err) {
      setError("Failed to save template");
    }
  };

  const handleLoadTemplate = async (template: WorkflowTemplate) => {
    try {
      await api.post(`/workflows/${automationId}/templates/${template.id}/apply`);
      onLoadTemplate(template);
    } catch (err) {
      setError("Failed to load template");
    }
  };

  return (
    <div className="workflow-template-manager">
      <div className="header">
        <h3>Workflow Templates</h3>
        <button onClick={() => setShowSaveDialog(true)} className="btn-primary">
          Save as Template
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showSaveDialog && (
        <div className="modal">
          <div className="modal-content">
            <h4>Save Workflow as Template</h4>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              onKeyPress={(e) => e.key === "Enter" && handleSaveTemplate()}
            />
            <div className="modal-actions">
              <button onClick={handleSaveTemplate} className="btn-success">
                Save
              </button>
              <button onClick={() => setShowSaveDialog(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="empty-state">No templates yet. Create one to reuse workflows!</div>
      ) : (
        <div className="template-list">
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-info">
                <h4>{template.template_name}</h4>
                <p>{template.template_description}</p>
                <small>v{template.version} • Used {template.usage_count} times</small>
              </div>
              <button onClick={() => handleLoadTemplate(template)} className="btn-secondary">
                Load
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
