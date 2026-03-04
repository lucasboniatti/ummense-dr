/**
 * DAG Visualization Component
 * Renders Directed Acyclic Graph workflow as interactive diagram
 */

import React from "react";
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

  // Design token colors
  const stepColors: Record<string, string> = {
    trigger: "#10b981",
    action: "#3b82f6",
    decision: "#f59e0b",
    aggregate: "#8b5cf6",
  };

  const getStepColor = (type: string) => stepColors[type] || "#6b7280";

  return (
    <div className="space-y-4">
      <svg
        ref={svgRef}
        width="100%"
        height="400"
        onClick={handleSvgClick}
        className="border border-neutral-300 rounded-lg bg-white"
        style={{ cursor: "crosshair" }}
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
                  stroke="#9ca3af"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            });
          })}

        {/* Arrow marker */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#9ca3af" />
          </marker>
        </defs>

        {/* Nodes */}
        {workflow.steps.map((step, index) => {
          const pos = getNodePosition(index);
          const color = getStepColor(step.type);

          return (
            <g
              key={step.id}
              onClick={() => onStepSelect(step.id)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r="40"
                fill={color}
                opacity="0.85"
                className="hover:opacity-100 transition-opacity"
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dy="0.3em"
                fill="white"
                fontSize="12"
                fontWeight="bold"
              >
                {step.type[0].toUpperCase()}
              </text>
              <text
                x={pos.x}
                y={pos.y + 20}
                textAnchor="middle"
                fill="white"
                fontSize="10"
              >
                {step.name.substring(0, 8)}
              </text>
              {/* Delete button */}
              <circle
                cx={pos.x + 35}
                cy={pos.y - 35}
                r="12"
                fill="#ef4444"
                opacity="0"
                onClick={(e) => {
                  e.stopPropagation();
                  onStepDelete(step.id);
                }}
                style={{ cursor: "pointer" }}
                className="hover:opacity-100 transition-opacity"
              />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span style={{ color: getStepColor("trigger") }} className="text-xl">
            ●
          </span>
          <span className="text-sm text-neutral-700 font-medium">Trigger</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: getStepColor("action") }} className="text-xl">
            ●
          </span>
          <span className="text-sm text-neutral-700 font-medium">Action</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: getStepColor("decision") }} className="text-xl">
            ●
          </span>
          <span className="text-sm text-neutral-700 font-medium">Decision</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: getStepColor("aggregate") }} className="text-xl">
            ●
          </span>
          <span className="text-sm text-neutral-700 font-medium">Aggregate</span>
        </div>
      </div>
    </div>
  );
};
