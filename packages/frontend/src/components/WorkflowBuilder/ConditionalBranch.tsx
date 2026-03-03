/**
 * Conditional Branch Editor Component
 * Edit if/then/else logic for decision steps
 */

import React, { useState } from "react";
import { ConditionalEvaluator } from "../../workflows/conditional-evaluator";

interface ConditionalBranchProps {
  expression: string;
  onExpressionChange: (expression: string) => void;
  onTrueBranchChange: (stepId: string) => void;
  onFalseBranchChange: (stepId: string) => void;
  trueBranchStepId?: string;
  falseBranchStepId?: string;
  availableSteps: Array<{ id: string; name: string }>;
}

export const ConditionalBranch: React.FC<ConditionalBranchProps> = ({
  expression,
  onExpressionChange,
  onTrueBranchChange,
  onFalseBranchChange,
  trueBranchStepId,
  falseBranchStepId,
  availableSteps,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  const handleExpressionChange = (value: string) => {
    onExpressionChange(value);

    // Validate expression
    const validation = ConditionalEvaluator.validateSyntax(value);
    if (validation.valid) {
      setIsValid(true);
      setError(null);
    } else {
      setIsValid(false);
      setError(validation.error || "Invalid expression");
    }
  };

  return (
    <div className="conditional-branch-editor">
      <h3>Conditional Logic</h3>

      <div className="form-group">
        <label htmlFor="condition">Condition Expression:</label>
        <textarea
          id="condition"
          value={expression}
          onChange={(e) => handleExpressionChange(e.target.value)}
          placeholder="e.g., trigger.status == 'active' AND trigger.count > 10"
          rows={3}
          style={{ borderColor: isValid ? "#ccc" : "#f44336" }}
        />
        {!isValid && <div className="error-message">{error}</div>}
        <div className="hint">
          Available: trigger.*, previous.*, Operators: ==, !=, &lt;, &gt;, &lt;=, &gt;=, AND, OR, NOT
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="true-branch">If TRUE, continue to:</label>
        <select value={trueBranchStepId || ""} onChange={(e) => onTrueBranchChange(e.target.value)}>
          <option value="">-- Select step --</option>
          {availableSteps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="false-branch">If FALSE, continue to:</label>
        <select value={falseBranchStepId || ""} onChange={(e) => onFalseBranchChange(e.target.value)}>
          <option value="">-- Select step --</option>
          {availableSteps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.name}
            </option>
          ))}
        </select>
      </div>

      <div className="syntax-help">
        <h4>Expression Examples:</h4>
        <ul>
          <li>trigger.status == 'active'</li>
          <li>trigger.count > 100</li>
          <li>previous.result == true AND trigger.retry_count &lt; 3</li>
          <li>NOT (trigger.error == 'TIMEOUT')</li>
        </ul>
      </div>
    </div>
  );
};
