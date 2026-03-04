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
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">Conditional Logic</h3>
      </div>

      <div className="space-y-2">
        <label htmlFor="condition" className="block text-sm font-medium text-neutral-700">
          Condition Expression:
        </label>
        <textarea
          id="condition"
          value={expression}
          onChange={(e) => handleExpressionChange(e.target.value)}
          placeholder="e.g., trigger.status == 'active' AND trigger.count > 10"
          rows={3}
          className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 ${
            isValid
              ? 'border-neutral-300 focus:ring-primary-500'
              : 'border-error-500 focus:ring-error-500'
          }`}
        />
        {!isValid && (
          <div className="text-sm text-error-600 font-medium">{error}</div>
        )}
        <div className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded-md">
          Available: trigger.*, previous.*, Operators: ==, !=, &lt;, &gt;, &lt;=, &gt;=, AND, OR, NOT
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="true-branch" className="block text-sm font-medium text-neutral-700">
          If TRUE, continue to:
        </label>
        <select
          id="true-branch"
          value={trueBranchStepId || ""}
          onChange={(e) => onTrueBranchChange(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">-- Select step --</option>
          {availableSteps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="false-branch" className="block text-sm font-medium text-neutral-700">
          If FALSE, continue to:
        </label>
        <select
          id="false-branch"
          value={falseBranchStepId || ""}
          onChange={(e) => onFalseBranchChange(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">-- Select step --</option>
          {availableSteps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 space-y-2">
        <h4 className="text-sm font-semibold text-neutral-900">Expression Examples:</h4>
        <ul className="text-xs text-neutral-700 space-y-1 list-disc list-inside">
          <li>trigger.status == 'active'</li>
          <li>trigger.count &gt; 100</li>
          <li>previous.result == true AND trigger.retry_count &lt; 3</li>
          <li>NOT (trigger.error == 'TIMEOUT')</li>
        </ul>
      </div>
    </div>
  );
};
