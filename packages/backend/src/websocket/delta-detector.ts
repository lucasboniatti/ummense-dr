import { ExecutionHistoryService } from '../automations/history/history.service';
import { logger } from '../utils/logger';

interface ExecutionSnapshot {
  id: string;
  status: string;
  duration: number;
  error_context: any;
  updated_at: string;
}

interface Delta {
  execution_id: string;
  changes: Record<string, any>;
  updated_at: string;
  timestamp: string;
}

/**
 * In-memory cache for execution state snapshots
 * Used to detect deltas by comparing snapshots
 * Keys: exec:{execution_id}:{field}
 */
const executionCache = new Map<string, any>();

export class DeltaDetector {
  private executionService: ExecutionHistoryService;
  private pollInterval: number;
  private isRunning: boolean = false;

  constructor(executionService: ExecutionHistoryService, pollInterval: number = 10000) {
    this.executionService = executionService;
    this.pollInterval = pollInterval;
  }

  /**
   * Detect deltas by comparing current and cached snapshots
   * Only sends fields that changed
   */
  async detectDeltas(userId: string, since?: Date): Promise<Delta[]> {
    const startTime = Date.now();

    try {
      // Query recent executions using existing API
      const recentResult = await this.executionService.queryExecutionHistory({
        userId,
        startDate: since || new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        endDate: new Date(),
        limit: 100,
      });
      const recent = recentResult.executions || [];

      if (!Array.isArray(recent)) {
        logger.warn(`[DeltaDetector] Invalid response format for user ${userId}`);
        return [];
      }

      const deltas: Delta[] = [];
      const fieldsToTrack = ['status', 'duration', 'error_context', 'updated_at'];

      for (const exec of recent) {
        const changed: Record<string, any> = {};

        // Check each tracked field for changes
        for (const field of fieldsToTrack) {
          const cacheKey = `exec:${exec.id}:${field}`;
          const currentValue = exec[field];
          const cachedValue = executionCache.get(cacheKey);

          // Detect change
          let hasChanged = false;
          if (field === 'error_context') {
            // Special handling for objects: stringify for comparison
            const currentStr = JSON.stringify(currentValue);
            const cachedStr = cachedValue ? JSON.stringify(cachedValue) : undefined;
            hasChanged = currentStr !== cachedStr;
          } else {
            hasChanged = currentValue !== cachedValue;
          }

          if (hasChanged) {
            changed[field] = currentValue;
            executionCache.set(cacheKey, currentValue);
          }
        }

        // Only emit delta if something changed
        if (Object.keys(changed).length > 0) {
          deltas.push({
            execution_id: exec.id,
            changes: changed,
            updated_at: exec.updated_at,
            timestamp: new Date().toISOString(),
          });

          logger.debug(
            `[DeltaDetector] Delta detected for execution ${exec.id}:`,
            Object.keys(changed)
          );
        }
      }

      const duration = Date.now() - startTime;
      if (deltas.length > 0) {
        logger.info(
          `[DeltaDetector] Found ${deltas.length} deltas in ${duration}ms for user ${userId}`
        );
      }

      return deltas;
    } catch (error) {
      logger.error(`[DeltaDetector] Error detecting deltas for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Clear cache for a specific execution (used after updates)
   */
  clearExecutionFromCache(executionId: string): void {
    const keysToDelete: string[] = [];

    for (const key of executionCache.keys()) {
      if (key.startsWith(`exec:${executionId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => executionCache.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug(`[DeltaDetector] Cleared ${keysToDelete.length} cache entries for ${executionId}`);
    }
  }

  /**
   * Clear entire cache (use with caution)
   */
  clearAllCache(): void {
    const size = executionCache.size;
    executionCache.clear();
    logger.info(`[DeltaDetector] Cleared all cache (${size} entries)`);
  }

  /**
   * Get cache stats for monitoring
   */
  getCacheStats() {
    return {
      size: executionCache.size,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate delta message size
   * Target: <1KB per delta
   */
  validateDeltaSize(delta: Delta): boolean {
    const message = JSON.stringify({
      type: 'execution-update',
      data: delta,
      timestamp: new Date().toISOString(),
    });

    const sizeKb = Buffer.byteLength(message) / 1024;

    if (sizeKb > 1) {
      logger.warn(
        `[DeltaDetector] Delta message size ${sizeKb.toFixed(2)}KB exceeds 1KB target for execution ${delta.execution_id}`
      );
      return false;
    }

    return true;
  }

  /**
   * Calculate latency metrics
   */
  calculateLatency(executionUpdatedAt: string): number {
    const updateTime = new Date(executionUpdatedAt).getTime();
    const now = Date.now();
    return now - updateTime; // milliseconds
  }
}

/**
 * Global delta detector instance
 */
let deltaDetector: DeltaDetector | null = null;

export function initializeDeltaDetector(
  executionService: ExecutionHistoryService
): DeltaDetector {
  if (!deltaDetector) {
    deltaDetector = new DeltaDetector(executionService);
  }
  return deltaDetector;
}

export function getDeltaDetector(): DeltaDetector {
  if (!deltaDetector) {
    throw new Error('DeltaDetector not initialized. Call initializeDeltaDetector first.');
  }
  return deltaDetector;
}
