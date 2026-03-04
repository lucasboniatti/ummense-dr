/**
 * Legacy Adapter - Backwards compatibility for Wave 2 automations
 * Transparently converts Wave 2 single-step automations to multi-step workflows
 * Story 3.1: Workflow Execution Engine Refactor - AC#4
 */

import { WorkflowConfig, StepDefinition } from '../../db/models/execution.model';

/**
 * Wave 2 Automation structure (legacy)
 */
export interface Wave2Automation {
  id: string;
  type: string;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Convert a Wave 2 single-step automation to a modern multi-step workflow
 * All Wave 2 automations become single-step workflows internally
 *
 * @param automation - Wave 2 automation record
 * @returns Modern workflow config with version=2 (converted)
 */
export function convertLegacyAutomation(automation: Wave2Automation): WorkflowConfig {
  const legacyStep: StepDefinition = {
    id: 'legacy-step-1',
    type: automation.type,
    config: automation.config,
    onError: 'fail', // Default: fail on error
  };

  return {
    id: automation.id,
    version: 2, // Mark as converted Wave 2 automation
    steps: [legacyStep],
  };
}

/**
 * Check if an automation is a converted Wave 2 automation
 */
export function isConvertedWave2(workflow: WorkflowConfig): boolean {
  return workflow.version === 2 && workflow.steps.length === 1 && workflow.steps[0].id === 'legacy-step-1';
}

/**
 * Extract the original Wave 2 step from a converted workflow
 * Used for backwards compatibility in output formatting
 */
export function extractLegacyStep(workflow: WorkflowConfig): StepDefinition | null {
  if (isConvertedWave2(workflow)) {
    return workflow.steps[0];
  }
  return null;
}

/**
 * Wrap execution result for legacy API response format
 * Wave 2 clients expect flat result structure, not nested steps
 *
 * @param executionId - Execution ID
 * @param output - Step output from modern execution
 * @param durationMs - Execution duration
 * @returns Formatted result compatible with Wave 2 API
 */
export function formatLegacyResponse(
  executionId: string,
  output: Record<string, unknown> | undefined,
  durationMs: number
): Record<string, unknown> {
  return {
    id: executionId,
    success: output !== undefined,
    output: output || null,
    durationMs,
    timestamp: new Date().toISOString(),
  };
}
