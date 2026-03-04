export interface WorkflowStep {
  id: string;
  name: string;
  type: 'trigger' | 'action' | 'decision' | 'aggregate' | string;
  config: Record<string, any>;
}

export interface WorkflowDefinition {
  id?: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  dependencies: Map<string, string[]>;
}

export interface WorkflowTemplate {
  id: string;
  template_name: string;
  template_description?: string;
  workflow_definition: Partial<WorkflowDefinition>;
  version: string;
  usage_count: number;
}
