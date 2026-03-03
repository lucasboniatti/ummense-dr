import { Request, Response, NextFunction } from 'express';
import { ExecutionHistoryService } from './history.service';

export interface AuditRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
  auditAction?: string;
  auditAutomationId?: string;
  auditChanges?: { old?: any; new?: any };
}

/**
 * Audit logging middleware
 * Captures user actions asynchronously (non-blocking)
 * Attaches auditLog() method to response for convenience
 */
export function createAuditMiddleware(historyService: ExecutionHistoryService) {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    // Attach auditLog method to response for convenience
    res.locals.auditLog = async (
      action: string,
      automationId?: string,
      changes?: { old?: any; new?: any }
    ) => {
      if (!req.user?.id) return;

      // Log asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          await historyService.logAuditAction(
            req.user!.id,
            action,
            automationId,
            changes,
            req.ip,
            req.get('user-agent')
          );
        } catch (error) {
          // Silently fail - audit logging should not break the API
          console.error('Audit logging failed:', error);
        }
      });
    };

    next();
  };
}

/**
 * Convenience function to log audit action
 * Usage in route handler:
 *   await res.locals.auditLog('modify_automation', automationId, { old: oldData, new: newData });
 */
export async function logAuditAction(
  res: Response,
  action: string,
  automationId?: string,
  changes?: { old?: any; new?: any }
) {
  if (res.locals.auditLog) {
    await res.locals.auditLog(action, automationId, changes);
  }
}
