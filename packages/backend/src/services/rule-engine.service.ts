import { createClient } from '@supabase/supabase-js';
import { ruleEvaluationService } from './rule-evaluation.service';
import { ruleExecutionService } from './rule-execution.service';
import { loopDetectorService } from './loop-detector.service';
import { rateLimiterService } from './rate-limiter.service';

interface RuleConfig {
  trigger: {
    event_type: string;
    filters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    params: Record<string, any>;
  }>;
  maxDepth?: number;
  conditionLogic?: 'AND' | 'OR';
}

/**
 * Rule Engine Service
 * Main orchestrator for rule evaluation and execution
 */
export class RuleEngineService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  /**
   * Execute rule triggered by event
   * @param ruleId Rule ID
   * @param event Event that triggered the rule
   * @param context Additional context data
   * @param executionChain Current execution chain (for loop detection)
   */
  async executeRule(
    ruleId: string,
    event: any,
    context: Record<string, any> = {},
    executionChain: string[] = []
  ): Promise<{
    success: boolean;
    error?: string;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      // Check for loops
      loopDetectorService.checkForLoop(ruleId, executionChain);

      // Check rate limiting
      const canExecute = await rateLimiterService.canExecuteRule(ruleId);
      if (!canExecute) {
        throw new Error(`Rate limit exceeded for rule ${ruleId}`);
      }

      // Fetch rule configuration
      const { data: rule, error: ruleError } = await this.supabase
        .from('rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (ruleError || !rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }

      if (!rule.enabled) {
        throw new Error(`Rule is disabled: ${ruleId}`);
      }

      const config = rule.config as RuleConfig;

      // Build execution context
      const executionContext = {
        ...context,
        event,
        rule: {
          id: ruleId,
          name: rule.rule_name
        }
      };

      // Check trigger filters
      if (config.trigger.filters && config.trigger.filters.length > 0) {
        const triggerMatches = ruleEvaluationService.evaluateConditions(
          config.trigger.filters,
          executionContext,
          'AND'
        );

        if (!triggerMatches) {
          console.log(`[RULE ENGINE] Trigger filters did not match for rule ${ruleId}`);
          return { success: false, duration: Date.now() - startTime };
        }
      }

      // Evaluate conditions
      const conditionsMetCount = config.conditions.length;
      const conditionLogic = config.conditionLogic || 'AND';

      if (conditionsMetCount > 0) {
        const conditionsMet = ruleEvaluationService.evaluateConditions(
          config.conditions,
          executionContext,
          conditionLogic
        );

        if (!conditionsMet) {
          console.log(
            `[RULE ENGINE] Conditions not met (${conditionLogic}) for rule ${ruleId}`
          );
          return { success: false, duration: Date.now() - startTime };
        }
      }

      // Execute actions
      const newExecutionChain = loopDetectorService.buildExecutionChain(
        ruleId,
        executionChain
      );

      const result = await ruleExecutionService.executeActions(
        ruleId,
        config.actions,
        executionContext
      );

      if (!result.success) {
        throw new Error(
          `Action execution failed: ${result.errors.join(', ')}`
        );
      }

      // Increment execution count
      await rateLimiterService.incrementExecutionCount(ruleId);

      // Log execution
      await this.logExecution(ruleId, {
        status: 'success',
        duration: Date.now() - startTime,
        executionChainDepth: newExecutionChain.length
      });

      console.log(`[RULE ENGINE] Rule ${ruleId} executed successfully`, {
        actionsExecuted: result.executedActions,
        duration: Date.now() - startTime
      });

      return { success: true, duration: Date.now() - startTime };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Log execution failure
      await this.logExecution(ruleId, {
        status: 'failed',
        error: errorMsg,
        duration: Date.now() - startTime,
        executionChainDepth: executionChain.length
      });

      console.error(`[RULE ENGINE] Rule ${ruleId} execution failed`, {
        error: errorMsg,
        duration: Date.now() - startTime
      });

      return {
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Create new rule
   * @param userId User ID
   * @param ruleName Rule name (unique per user)
   * @param config Rule configuration
   */
  async createRule(
    userId: string,
    ruleName: string,
    config: RuleConfig
  ): Promise<string> {
    // Check user rule limit
    const canCreate = await rateLimiterService.canCreateRule(userId);
    if (!canCreate) {
      throw new Error(`User has reached maximum rules limit (100)`);
    }

    // Validate configuration
    loopDetectorService.validateRuleConfig('', config as any);

    // Create rule
    const { data: newRule, error } = await this.supabase
      .from('rules')
      .insert([
        {
          user_id: userId,
          rule_name: ruleName,
          rule_version: 1,
          config,
          enabled: true,
          execution_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('id')
      .single();

    if (error || !newRule) {
      throw new Error(`Failed to create rule: ${error?.message}`);
    }

    // Log creation in history
    await this.logRuleChange(newRule.id, userId, 'created', null, config);

    return newRule.id;
  }

  /**
   * Update rule configuration
   * @param ruleId Rule ID
   * @param userId User ID (for audit trail)
   * @param config New rule configuration
   * @param changeReason Reason for change
   */
  async updateRule(
    ruleId: string,
    userId: string,
    config: RuleConfig,
    changeReason?: string
  ): Promise<void> {
    // Get current rule config
    const { data: rule, error: fetchError } = await this.supabase
      .from('rules')
      .select('config, rule_version')
      .eq('id', ruleId)
      .single();

    if (fetchError || !rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    // Validate new configuration
    loopDetectorService.validateRuleConfig(ruleId, config as any);

    // Update rule
    const { error } = await this.supabase
      .from('rules')
      .update({
        config,
        rule_version: (rule.rule_version || 1) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId);

    if (error) {
      throw new Error(`Failed to update rule: ${error.message}`);
    }

    // Log change in history
    await this.logRuleChange(ruleId, userId, 'updated', rule.config, config, changeReason);
  }

  /**
   * Delete rule (soft delete)
   * @param ruleId Rule ID
   * @param userId User ID (for audit trail)
   * @param deleteReason Reason for deletion
   */
  async deleteRule(
    ruleId: string,
    userId: string,
    deleteReason?: string
  ): Promise<void> {
    const { data: rule, error: fetchError } = await this.supabase
      .from('rules')
      .select('config')
      .eq('id', ruleId)
      .single();

    if (fetchError || !rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    // Soft delete
    const { error } = await this.supabase
      .from('rules')
      .update({
        deleted_at: new Date().toISOString(),
        enabled: false
      })
      .eq('id', ruleId);

    if (error) {
      throw new Error(`Failed to delete rule: ${error.message}`);
    }

    // Log deletion in history
    await this.logRuleChange(ruleId, userId, 'deleted', rule.config, null, deleteReason);
  }

  /**
   * Log rule execution to automation_logs
   */
  private async logExecution(
    ruleId: string,
    details: {
      status: 'success' | 'failed';
      duration: number;
      error?: string;
      executionChainDepth: number;
    }
  ): Promise<void> {
    const { error } = await this.supabase.from('automation_logs').insert([
      {
        rule_id: ruleId,
        execution_status: details.status,
        duration_ms: details.duration,
        error_message: details.error,
        execution_chain_depth: details.executionChainDepth,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      console.error(`[RULE ENGINE] Failed to log execution:`, error);
    }
  }

  /**
   * Log rule change to rule_history
   */
  private async logRuleChange(
    ruleId: string,
    userId: string,
    changeType: string,
    oldConfig: any,
    newConfig: any,
    changeReason?: string
  ): Promise<void> {
    const { error } = await this.supabase.from('rule_history').insert([
      {
        rule_id: ruleId,
        changed_by: userId,
        change_type: changeType,
        old_config: oldConfig,
        new_config: newConfig,
        change_reason: changeReason,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      console.error(`[RULE ENGINE] Failed to log rule change:`, error);
    }
  }
}

export const ruleEngineService = new RuleEngineService();
