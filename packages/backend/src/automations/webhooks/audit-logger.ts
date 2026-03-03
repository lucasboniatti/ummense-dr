/**
 * WebhookAuditLogger - Immutable audit log for webhook delivery attempts
 * Story 3.2: Webhook Reliability & Retry Logic
 * Captures all delivery attempts with timestamps, payloads, and outcomes
 */

/**
 * Audit log entry for a webhook delivery attempt
 */
export interface WebhookAuditLogEntry {
  id: string;
  automationId: string;
  webhookDeliveryId: string;
  webhookUrl: string;
  attemptNumber: number;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  httpStatusCode?: number;
  errorMessage?: string;
  responseTime: number; // milliseconds
  payloadSize: number; // bytes
  responseSize?: number; // bytes
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  createdAt: string;
}

/**
 * Query options for audit log retrieval
 */
export interface AuditLogQueryOptions {
  webhookDeliveryId?: string;
  automationId?: string;
  status?: 'pending' | 'success' | 'failed' | 'timeout';
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  page?: number;
}

/**
 * WebhookAuditLogger - Immutable append-only audit log
 */
export class WebhookAuditLogger {
  private db: any; // Database connection
  private readonly TABLE_NAME = 'webhook_delivery_audit_logs';

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Log a webhook delivery attempt
   * Append-only: creates new record, never updates
   */
  async logDeliveryAttempt(entry: Omit<WebhookAuditLogEntry, 'id' | 'createdAt'>): Promise<WebhookAuditLogEntry> {
    try {
      const { v4: uuidv4 } = await import('uuid');
      const now = new Date().toISOString();

      const logEntry: WebhookAuditLogEntry = {
        ...entry,
        id: uuidv4(),
        createdAt: now
      };

      // Insert into audit log (append-only)
      await this.db(this.TABLE_NAME).insert(logEntry);

      console.log(
        `[WebhookAudit] Logged delivery attempt ${entry.attemptNumber} for webhook ${entry.webhookUrl}`
      );

      return logEntry;
    } catch (error) {
      console.error('[WebhookAudit] Failed to log delivery attempt:', error);
      throw new Error(
        `Failed to log audit entry: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Log successful delivery
   */
  async logSuccess(
    webhookDeliveryId: string,
    automationId: string,
    webhookUrl: string,
    attemptNumber: number,
    responseTime: number,
    payloadSize: number,
    httpStatusCode: number = 200,
    responseSize: number = 0
  ): Promise<WebhookAuditLogEntry> {
    return this.logDeliveryAttempt({
      automationId,
      webhookDeliveryId,
      webhookUrl,
      attemptNumber,
      status: 'success',
      httpStatusCode,
      responseTime,
      payloadSize,
      responseSize
    });
  }

  /**
   * Log failed delivery attempt
   */
  async logFailure(
    webhookDeliveryId: string,
    automationId: string,
    webhookUrl: string,
    attemptNumber: number,
    responseTime: number,
    payloadSize: number,
    errorMessage: string,
    httpStatusCode?: number,
    responseSize?: number
  ): Promise<WebhookAuditLogEntry> {
    return this.logDeliveryAttempt({
      automationId,
      webhookDeliveryId,
      webhookUrl,
      attemptNumber,
      status: httpStatusCode ? 'failed' : 'timeout',
      httpStatusCode,
      errorMessage,
      responseTime,
      payloadSize,
      responseSize
    });
  }

  /**
   * Get delivery history for a webhook delivery
   */
  async getDeliveryHistory(webhookDeliveryId: string, limit: number = 50): Promise<WebhookAuditLogEntry[]> {
    try {
      const entries = await this.db(this.TABLE_NAME)
        .select('*')
        .where('webhook_delivery_id', webhookDeliveryId)
        .orderBy('attempt_number', 'asc')
        .limit(limit);

      return entries;
    } catch (error) {
      console.error('[WebhookAudit] Failed to retrieve delivery history:', error);
      throw new Error(
        `Failed to retrieve delivery history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(options: AuditLogQueryOptions = {}): Promise<{
    entries: WebhookAuditLogEntry[];
    total: number;
  }> {
    try {
      let query = this.db(this.TABLE_NAME).select('*');

      // Apply filters
      if (options.webhookDeliveryId) {
        query = query.where('webhook_delivery_id', options.webhookDeliveryId);
      }

      if (options.automationId) {
        query = query.where('automation_id', options.automationId);
      }

      if (options.status) {
        query = query.where('status', options.status);
      }

      if (options.createdAfter) {
        query = query.where('created_at', '>=', options.createdAfter.toISOString());
      }

      if (options.createdBefore) {
        query = query.where('created_at', '<=', options.createdBefore.toISOString());
      }

      // Get total count
      const countResult = await query
        .clone()
        .count('* as total')
        .first();
      const total = countResult?.total || 0;

      // Apply pagination and ordering
      const page = options.page || 1;
      const limit = options.limit || 100;
      const offset = (page - 1) * limit;

      const entries = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        entries,
        total
      };
    } catch (error) {
      console.error('[WebhookAudit] Failed to query audit logs:', error);
      throw new Error(
        `Failed to query audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get statistics for audit logs
   */
  async getStatistics(automationId: string, days: number = 7): Promise<{
    totalAttempts: number;
    successCount: number;
    failureCount: number;
    timeoutCount: number;
    successRate: number;
    averageResponseTime: number;
    averagePayloadSize: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const stats = await this.db(this.TABLE_NAME)
        .select(
          this.db.raw('COUNT(*) as total_attempts'),
          this.db.raw("COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count"),
          this.db.raw("COUNT(CASE WHEN status = 'failed' THEN 1 END) as failure_count"),
          this.db.raw("COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_count"),
          this.db.raw('AVG(response_time) as avg_response_time'),
          this.db.raw('AVG(payload_size) as avg_payload_size')
        )
        .where('automation_id', automationId)
        .where('created_at', '>=', cutoffDate.toISOString())
        .first();

      const totalAttempts = stats?.total_attempts || 0;
      const successCount = stats?.success_count || 0;
      const failureCount = stats?.failure_count || 0;
      const timeoutCount = stats?.timeout_count || 0;

      return {
        totalAttempts,
        successCount,
        failureCount,
        timeoutCount,
        successRate: totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0,
        averageResponseTime: Math.round(stats?.avg_response_time || 0),
        averagePayloadSize: Math.round(stats?.avg_payload_size || 0)
      };
    } catch (error) {
      console.error('[WebhookAudit] Failed to get statistics:', error);
      throw new Error(
        `Failed to get audit statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cleanup old audit logs (separate from webhook_deliveries)
   * Audit logs have longer retention (6 months minimum recommended)
   */
  async cleanupOldLogs(retentionDays: number = 180): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await this.db(this.TABLE_NAME)
        .where('created_at', '<', cutoffDate.toISOString())
        .del();

      console.log(
        `[WebhookAudit] Deleted ${deletedCount} audit logs older than ${retentionDays} days`
      );

      return deletedCount;
    } catch (error) {
      console.error('[WebhookAudit] Failed to cleanup logs:', error);
      throw new Error(
        `Failed to cleanup audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Create audit logger instance with database connection
 */
export function createAuditLogger(db: any): WebhookAuditLogger {
  return new WebhookAuditLogger(db);
}
