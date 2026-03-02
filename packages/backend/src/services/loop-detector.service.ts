/**
 * Loop Detector Service
 * Prevents rules from triggering themselves directly or indirectly
 */
export class LoopDetectorService {
  private readonly MAX_DEPTH = 3; // Max 3 levels of nested rule execution

  /**
   * Track execution context to detect loops
   * @param ruleId Current rule being executed
   * @param executionChain Stack of rule IDs in current execution chain
   * @throws Error if loop detected or max depth exceeded
   */
  checkForLoop(ruleId: string, executionChain: string[] = []): void {
    // Check if rule already in execution chain (self-trigger or indirect loop)
    if (executionChain.includes(ruleId)) {
      throw new Error(
        `Loop detected: Rule ${ruleId} is already in execution chain: ${executionChain.join(' → ')} → ${ruleId}`
      );
    }

    // Check if max depth exceeded
    if (executionChain.length >= this.MAX_DEPTH) {
      throw new Error(
        `Max execution depth (${this.MAX_DEPTH}) exceeded: ${executionChain.join(' → ')} → ${ruleId}`
      );
    }
  }

  /**
   * Get execution depth for current rule chain
   * @param executionChain Current execution chain
   * @returns Current depth (0 = top-level, 1 = first nested, etc.)
   */
  getExecutionDepth(executionChain: string[] = []): number {
    return executionChain.length;
  }

  /**
   * Check if rule can execute at current depth
   * @param ruleId Rule to check
   * @param executionChain Current execution chain
   * @returns true if rule can execute, false otherwise
   */
  canExecuteAtDepth(ruleId: string, executionChain: string[] = []): boolean {
    try {
      this.checkForLoop(ruleId, executionChain);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Build new execution chain for nested rule execution
   * @param ruleId Rule to add to chain
   * @param parentChain Parent execution chain
   * @returns New execution chain with ruleId appended
   */
  buildExecutionChain(ruleId: string, parentChain: string[] = []): string[] {
    // Validate before building
    this.checkForLoop(ruleId, parentChain);

    // Return new chain
    return [...parentChain, ruleId];
  }

  /**
   * Validate rule configuration doesn't reference itself
   * This is a preventive measure in addition to runtime detection
   * @param ruleId Rule ID
   * @param config Rule configuration
   * @throws Error if rule references itself in actions
   */
  validateRuleConfig(
    ruleId: string,
    config: { actions?: Array<{ triggeredRuleId?: string }> }
  ): void {
    if (!config.actions) {
      return;
    }

    for (const action of config.actions) {
      if (action.triggeredRuleId === ruleId) {
        throw new Error(`Rule ${ruleId} cannot trigger itself (self-reference)`);
      }
    }
  }
}

export const loopDetectorService = new LoopDetectorService();
