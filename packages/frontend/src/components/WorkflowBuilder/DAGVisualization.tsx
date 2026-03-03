/**
 * DAG Visualization Component
 * Renders Directed Acyclic Graph workflow as interactive diagram
 */

import React, { useCallback } from "react";
import { WorkflowDefinition } from "../../types";

interface DAGVisualizationProps {
  workflow: WorkflowDefinition;
  onStepSelect: (stepId: string) => void;
  onStepAdd: (position: { x: number; y: number }) => void;
  onStepDelete: (stepId: string) => void;
}

export const DAGVisualization: React.FC<DAGVisualizationProps> = ({
  workflow,
  onStepSelect,
  onStepAdd,
  onStepDelete,
}) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  // Calculate positions for nodes (simple grid layout for demo)
  const getNodePosition = (index: number) => {
    const x = 100 + index * 150;
    const y = 150;
    return { x, y };
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onStepAdd({ x, y });
    }
  };

  return (
    <div className="dag-visualization">
      <svg
        ref={svgRef}
        width="100%"
        height="400"
        onClick={handleSvgClick}
        style={{ border: "1px solid #ddd", cursor: "crosshair" }}
      >
        {/* Draw connections between steps */}
        {workflow.dependencies &&
          Array.from(workflow.dependencies.entries()).map(([stepId, deps]) => {
            const sourceStep = workflow.steps.find((s) => s.id === stepId);
            if (!sourceStep) return null;

            const sourceIndex = workflow.steps.indexOf(sourceStep);
            const sourcePos = getNodePosition(sourceIndex);

            return deps.map((depId) => {
              const depStep = workflow.steps.find((s) => s.id === depId);
              if (!depStep) return null;

              const depIndex = workflow.steps.indexOf(depStep);
              const depPos = getNodePosition(depIndex);

              return (
                <line
                  key={`${stepId}-${depId}`}
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={depPos.x}
                  y2={depPos.y}
                  stroke="#999"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            });
          })}

        {/* Draw arrow marker */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#999" />
          </marker>
        </defs>

        {/* Draw nodes */}
        {workflow.steps.map((step, index) => {
          const pos = getNodePosition(index);
          const colors: Record<string, string> = {
            trigger: "#4CAF50",
            action: "#2196F3",
            decision: "#FFC107",
            aggregate: "#9C27B0",
          };
          const color = colors[step.type] || "#999";

          return (
            <g key={step.id} onClick={() => onStepSelect(step.id)}>
              <circle cx={pos.x} cy={pos.y} r="40" fill={color} opacity="0.8" />
              <text x={pos.x} y={pos.y} textAnchor="middle" dy="0.3em" fill="white" fontSize="12" fontWeight="bold">
                {step.type[0].toUpperCase()}
              </text>
              <text x={pos.x} y={pos.y + 20} textAnchor="middle" fill="white" fontSize="10">
                {step.name.substring(0, 8)}
              </text>
              {/* Delete button */}
              <circle
                cx={pos.x + 35}
                cy={pos.y - 35}
                r="12"
                fill="red"
                opacity="0"
                onClick={(e) => {
                  e.stopPropagation();
                  onStepDelete(step.id);
                }}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        })}
      </svg>

      <div className="dag-legend">
        <div>
          <span style={{ color: "#4CAF50" }}>●</span> Trigger
        </div>
        <div>
          <span style={{ color: "#2196F3" }}>●</span> Action
        </div>
        <div>
          <span style={{ color: "#FFC107" }}>●</span> Decision
        </div>
        <div>
          <span style={{ color: "#9C27B0" }}>●</span> Aggregate
        </div>
      </div>
    </div>
  );
};
