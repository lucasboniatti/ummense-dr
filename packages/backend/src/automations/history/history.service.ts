import { Database } from '@/types/database';
import { createClient } from '@supabase/supabase-js';

export interface ExecutionHistoryQuery {
  userId: string;
  automationId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'success' | 'failed' | 'skipped';
  errorType?: string;
  searchTerm?: string;
  sortBy?: 'timestamp' | 'status' | 'duration';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ExecutionRecord {
  id: string;
  automation_id: string;
  automation_name: string;
  user_id: string;
  status: string;
  trigger_type: string;
  trigger_data: any;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_context?: any;
  created_at: string;
}

export class ExecutionHistoryService {
  constructor(private db: ReturnType<typeof createClient<Database>>) {}

  /**
   * Query execution history with filters, search, pagination
   */
  async queryExecutionHistory(query: ExecutionHistoryQuery) {
    let q = this.db
      .from('execution_histories')
      .select('*, automations(name)', { count: 'exact' })
      .eq('user_id', query.userId);

    if (query.automationId) {
      q = q.eq('automation_id', query.automationId);
    }

    if (query.status) {
      q = q.eq('status', query.status);
    }

    if (query.startDate && query.endDate) {
      q = q
        .gte('created_at', query.startDate.toISOString())
        .lte('created_at', query.endDate.toISOString());
    }

    if (query.errorType && query.status === 'failed') {
      // Search in error_context for specific error type
      q = q.filter('error_context->>error_type', 'eq', query.errorType);
    }

    if (query.searchTerm) {
      // Search by execution ID or automation name (client-side filtering)
      // This will be enhanced with full-text search in next iteration
    }

    // Pagination
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    q = q
      .order('created_at', { ascending: query.sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await q;

    if (error) throw error;

    return {
      executions: data || [],
      total: count || 0,
      limit,
      offset,
    };
  }

  /**
   * Get single execution detail with step breakdown
   */
  async getExecutionDetail(executionId: string, userId: string) {
    const { data: execution, error: execError } = await this.db
      .from('execution_histories')
      .select('*, automations(name)')
      .eq('id', executionId)
      .eq('user_id', userId)
      .single();

    if (execError) throw execError;

    // Fetch execution steps if they exist in the database
    const { data: steps, error: stepsError } = await this.db
      .from('execution_steps')
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: true });

    if (stepsError && stepsError.code !== 'PGRST116') throw stepsError;

    return {
      execution,
      steps: steps || [],
    };
  }

  /**
   * Export execution history as CSV
   */
  async exportAsCSV(query: ExecutionHistoryQuery): Promise<string> {
    const { executions } = await this.queryExecutionHistory({
      ...query,
      limit: 50000,
    });

    const headers = [
      'Execution ID',
      'Automation Name',
      'Status',
      'Trigger Type',
      'Started At',
      'Completed At',
      'Duration (ms)',
      'Error Message',
    ];

    const rows = executions.map((e: any) => [
      e.id,
      e.automations?.name || '',
      e.status,
      e.trigger_type,
      e.started_at,
      e.completed_at || '',
      e.duration_ms || '',
      e.error_context?.message || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Export execution history as JSON
   */
  async exportAsJSON(query: ExecutionHistoryQuery): Promise<string> {
    const { executions } = await this.queryExecutionHistory({
      ...query,
      limit: 50000,
    });

    return JSON.stringify(executions, null, 2);
  }

  /**
   * Log user action to audit_logs
   */
  async logAuditAction(
    userId: string,
    action: string,
    automationId?: string,
    changes?: { old?: any; new?: any },
    ipAddress?: string,
    userAgent?: string
  ) {
    const { error } = await this.db.from('audit_logs').insert({
      user_id: userId,
      automation_id: automationId,
      action,
      old_values: changes?.old || null,
      new_values: changes?.new || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date(),
    });

    if (error) {
      console.error('Audit logging error:', error);
      // Non-blocking: audit logs are nice-to-have, don't fail the operation
    }
  }

  /**
   * Get audit logs for automation or user
   */
  async getAuditLogs(
    userId: string,
    automationId?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    let q = this.db
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (automationId) {
      q = q.eq('automation_id', automationId);
    }

    const { data, count, error } = await q
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      logs: data || [],
      total: count || 0,
      limit,
      offset,
    };
  }

  /**
   * Get or create user retention policy
   */
  async getUserRetentionPolicy(userId: string) {
    let { data, error } = await this.db
      .from('user_retention_policies')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error?.code === 'PGRST116') {
      // Not found, create default
      const { data: newPolicy, error: createError } = await this.db
        .from('user_retention_policies')
        .insert({
          user_id: userId,
          retention_days: 90,
          archive_enabled: false,
        })
        .select()
        .single();

      if (createError) throw createError;
      return newPolicy;
    }

    if (error) throw error;
    return data;
  }

  /**
   * Update user retention policy
   */
  async updateRetentionPolicy(
    userId: string,
    retentionDays: number,
    archiveEnabled?: boolean,
    archiveBucket?: string
  ) {
    const { data, error } = await this.db
      .from('user_retention_policies')
      .update({
        retention_days: retentionDays,
        archive_enabled: archiveEnabled,
        archive_bucket: archiveBucket,
        updated_at: new Date(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Clean up old execution histories based on retention policy
   */
  async cleanupOldExecutions() {
    // Get all users' retention policies
    const { data: policies, error: policiesError } = await this.db
      .from('user_retention_policies')
      .select('*');

    if (policiesError) throw policiesError;

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

      // TODO: Archive to S3 if enabled
      // if (policy.archive_enabled) {
      //   await archiveToS3(...)
      // }

      // Delete old execution histories and their steps
      const { data: oldExecutions } = await this.db
        .from('execution_histories')
        .select('id')
        .eq('user_id', policy.user_id)
        .lt('created_at', cutoffDate.toISOString());

      if (oldExecutions && oldExecutions.length > 0) {
        const execIds = oldExecutions.map((e) => e.id);

        // Delete steps first
        await this.db
          .from('execution_steps')
          .delete()
          .in('execution_id', execIds);

        // Delete executions
        await this.db
          .from('execution_histories')
          .delete()
          .in('id', execIds);
      }
    }
  }
}
