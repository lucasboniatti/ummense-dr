import { createClient } from '@supabase/supabase-js';

/**
 * Rate Limiter Service
 * Enforces rate limits for rule execution
 * - Per-user: <100 rules max
 * - Per-rule: <1000 executions/day
 */
export class RateLimiterService {
  private supabase;
  private readonly MAX_RULES_PER_USER = 100;
  private readonly MAX_EXECUTIONS_PER_DAY = 1000;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  /**
   * Check if user can create more rules
   * @param userId User ID
   * @returns true if user can create rules, false if at limit
   */
  async canCreateRule(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('rules')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null); // Exclude soft-deleted rules

    if (error) {
      throw new Error(`Failed to check rule count: ${error.message}`);
    }

    const ruleCount = data?.length || 0;
    return ruleCount < this.MAX_RULES_PER_USER;
  }

  /**
   * Check if rule can execute today
   * @param ruleId Rule ID
   * @returns true if rule can execute, false if at daily limit
   */
  async canExecuteRule(ruleId: string): Promise<boolean> {
    const { data: rule, error } = await this.supabase
      .from('rules')
      .select('execution_count, last_execution_at')
      .eq('id', ruleId)
      .single();

    if (error) {
      throw new Error(`Failed to check rule execution count: ${error.message}`);
    }

    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    // Check if execution count is within daily limit
    const executionCount = rule.execution_count || 0;
    const lastExecutionAt = rule.last_execution_at
      ? new Date(rule.last_execution_at)
      : null;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // If last execution was yesterday or earlier, reset count
    if (
      !lastExecutionAt ||
      lastExecutionAt.getTime() < today.getTime()
    ) {
      return true; // Count resets daily
    }

    // Same day: check if at limit
    return executionCount < this.MAX_EXECUTIONS_PER_DAY;
  }

  /**
   * Increment execution count for rule
   * @param ruleId Rule ID
   */
  async incrementExecutionCount(ruleId: string): Promise<void> {
    const { data: rule, error: selectError } = await this.supabase
      .from('rules')
      .select('execution_count, last_execution_at')
      .eq('id', ruleId)
      .single();

    if (selectError) {
      throw new Error(`Failed to fetch rule: ${selectError.message}`);
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const lastExecutionAt = rule.last_execution_at
      ? new Date(rule.last_execution_at)
      : null;
    const lastExecutionIsToday =
      lastExecutionAt && lastExecutionAt.getTime() >= today.getTime();

    // If last execution was today, increment count; otherwise reset to 1
    const newCount = lastExecutionIsToday ? (rule.execution_count || 0) + 1 : 1;

    const { error: updateError } = await this.supabase
      .from('rules')
      .update({
        execution_count: newCount,
        last_execution_at: new Date().toISOString()
      })
      .eq('id', ruleId);

    if (updateError) {
      throw new Error(`Failed to update execution count: ${updateError.message}`);
    }
  }

  /**
   * Reset daily execution count (called by background job at UTC midnight)
   * @param ruleId Rule ID
   */
  async resetDailyCount(ruleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('rules')
      .update({
        execution_count: 0
      })
      .eq('id', ruleId);

    if (error) {
      throw new Error(`Failed to reset execution count: ${error.message}`);
    }
  }

  /**
   * Reset all daily execution counts for all rules
   * (Called by background job at UTC midnight)
   */
  async resetAllDailyCounts(): Promise<void> {
    const { error } = await this.supabase
      .from('rules')
      .update({
        execution_count: 0
      })
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to reset all execution counts: ${error.message}`);
    }

    console.log('[RATE LIMITER] Reset daily execution counts for all rules');
  }

  /**
   * Get current execution count for rule
   * @param ruleId Rule ID
   * @returns Current execution count
   */
  async getExecutionCount(ruleId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('rules')
      .select('execution_count, last_execution_at')
      .eq('id', ruleId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch execution count: ${error.message}`);
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const lastExecutionAt = data.last_execution_at
      ? new Date(data.last_execution_at)
      : null;
    const lastExecutionIsToday =
      lastExecutionAt && lastExecutionAt.getTime() >= today.getTime();

    // If last execution was today, return current count; otherwise return 0
    return lastExecutionIsToday ? data.execution_count || 0 : 0;
  }

  /**
   * Get user rule count
   * @param userId User ID
   * @returns Number of active rules for user
   */
  async getRuleCount(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('rules')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to count rules: ${error.message}`);
    }

    return data?.length || 0;
  }
}

export const rateLimiterService = new RateLimiterService();
