import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockEventStore = vi.hoisted(() => {
  let nextId = 0;
  const eventLogs: Array<Record<string, any>> = [];

  const applyFilters = (
    rows: Array<Record<string, any>>,
    filters: Array<(row: Record<string, any>) => boolean>
  ) => rows.filter((row) => filters.every((filter) => filter(row)));

  const reset = () => {
    nextId = 0;
    eventLogs.length = 0;
  };

  const seed = (overrides: Record<string, any> = {}) => {
    const record = {
      id: overrides.id ?? `event-log-${++nextId}`,
      user_id: overrides.user_id ?? 'user-1',
      event_type: overrides.event_type ?? 'task:created',
      event_id: overrides.event_id ?? `event-${nextId}`,
      event_version: overrides.event_version ?? 1,
      payload: overrides.payload ?? {},
      created_at: overrides.created_at ?? new Date().toISOString(),
      deleted_at: overrides.deleted_at ?? null,
      ...overrides,
    };

    eventLogs.push(record);
    return record;
  };

  const from = vi.fn((table: string) => {
    if (table !== 'event_logs') {
      throw new Error(`Unexpected table requested in event tests: ${table}`);
    }

    return {
      select: (_columns: string = '*') => {
        const filters: Array<(row: Record<string, any>) => boolean> = [];
        const builder: any = {
          eq(field: string, value: unknown) {
            filters.push((row) => row[field] === value);
            return builder;
          },
          single: async () => ({
            data: applyFilters(eventLogs, filters)[0] ?? null,
            error: null,
          }),
          maybeSingle: async () => ({
            data: applyFilters(eventLogs, filters)[0] ?? null,
            error: null,
          }),
          then(resolve: any, reject: any) {
            return Promise.resolve({
              data: applyFilters(eventLogs, filters),
              error: null,
            }).then(resolve, reject);
          },
        };

        return builder;
      },
      insert: (payload: Record<string, any> | Array<Record<string, any>>) => {
        let inserted: Array<Record<string, any>> | null = null;

        const applyInsert = () => {
          if (!inserted) {
            const records = (Array.isArray(payload) ? payload : [payload]).map((record) => ({
              id: record.id ?? `event-log-${++nextId}`,
              deleted_at: null,
              ...record,
            }));

            eventLogs.push(...records);
            inserted = records;
          }

          return inserted;
        };

        return {
          select: () => ({
            single: async () => ({
              data: applyInsert()[0],
              error: null,
            }),
          }),
          then(resolve: any, reject: any) {
            return Promise.resolve({ data: applyInsert(), error: null }).then(resolve, reject);
          },
        };
      },
      update: (values: Record<string, any>) => {
        const filters: Array<(row: Record<string, any>) => boolean> = [];

        const runUpdate = () => {
          const updated = applyFilters(eventLogs, filters).map((row) => {
            Object.assign(row, values);
            return row;
          });

          return { data: updated, error: null };
        };

        const builder: any = {
          eq(field: string, value: unknown) {
            filters.push((row) => row[field] === value);
            return builder;
          },
          lt(field: string, value: string) {
            const cutoff = new Date(value).getTime();
            filters.push((row) => new Date(String(row[field])).getTime() < cutoff);
            return builder;
          },
          is(field: string, value: unknown) {
            filters.push((row) => (row[field] ?? null) === value);
            return builder;
          },
          select: async () => runUpdate(),
          then(resolve: any, reject: any) {
            return Promise.resolve(runUpdate()).then(resolve, reject);
          },
        };

        return builder;
      },
    };
  });

  return { eventLogs, from, reset, seed };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockEventStore.from,
  })),
}));

import { EventCleanupJob } from '../src/jobs/event-cleanup.job';
import { WebSocketHeartbeatTimeoutJob } from '../src/jobs/websocket-heartbeat.job';
import { EventDeduplicationService } from '../src/services/event-deduplication.service';
import { EventEmitterService } from '../src/services/event-emitter.service';
import { WebSocketEventHandler } from '../src/websocket/event-handler';

describe('Event System Tests (Story 2.1)', () => {
  let eventEmitterService: EventEmitterService;
  let deduplicationService: EventDeduplicationService;

  beforeEach(() => {
    mockEventStore.reset();
    eventEmitterService = new EventEmitterService();
    deduplicationService = new EventDeduplicationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Unit Tests: Event Deduplication', () => {
    it('should detect duplicate events using UUID', async () => {
      const userId = 'user-123';
      const eventId = 'event-uuid-456';
      const eventType = 'task:created';

      await expect(
        deduplicationService.isEventDuplicate(userId, eventId, eventType)
      ).resolves.toBe(false);

      await eventEmitterService.emitEvent(userId, eventType, eventId, { taskId: 'task-1' });

      await expect(
        deduplicationService.isEventDuplicate(userId, eventId, eventType)
      ).resolves.toBe(true);
    });

    it('should validate event type format (domain:action)', async () => {
      await expect(
        eventEmitterService.emitEvent('user-123', 'task:created', 'uuid-1', { taskId: 'task-1' })
      ).resolves.toMatchObject({ eventType: 'task:created' });

      await expect(
        eventEmitterService.emitEvent('user-123', 'taskCreated', 'uuid-2', { taskId: 'task-1' })
      ).rejects.toThrow('Invalid event type format');
    });

    it('should support event versioning', async () => {
      const emitted = await eventEmitterService.emitEvent(
        'user-123',
        'automation:executed',
        'uuid-versioned',
        { taskId: 'task-1', priority: 'high' },
        2
      );

      expect(emitted.eventVersion).toBe(2);
      expect(emitted.payload).toMatchObject({ priority: 'high' });
    });
  });

  describe('Unit Tests: Event Emitter', () => {
    it('should generate UUID for events when not provided', async () => {
      const result = await eventEmitterService.emitEvent(
        'user-123',
        'task:created',
        undefined as unknown as string,
        { taskId: 'task-1' }
      );

      expect(result.eventId).toBeTruthy();
      expect(mockEventStore.eventLogs).toHaveLength(1);
    });

    it('should return existing event if duplicate (idempotent)', async () => {
      const first = await eventEmitterService.emitEvent(
        'user-123',
        'task:created',
        'event-dup',
        { taskId: 'task-1' }
      );
      const second = await eventEmitterService.emitEvent(
        'user-123',
        'task:created',
        'event-dup',
        { taskId: 'task-1' }
      );

      expect(second.id).toBe(first.id);
      expect(mockEventStore.eventLogs).toHaveLength(1);
    });

    it('should log event emission with observability data', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await eventEmitterService.emitEvent('user-123', 'task:created', 'uuid-456', {
        taskId: 'task-1',
      });

      expect(logSpy).toHaveBeenCalledWith(
        '[EVENT] task:created emitted',
        expect.objectContaining({ userId: 'user-123', eventId: 'uuid-456' })
      );
    });
  });

  describe('Integration Tests: Event Flow', () => {
    it('should emit event and broadcast to subscribers', async () => {
      const handler = vi.fn();
      eventEmitterService.onEvent('task:created', handler);

      const event = await eventEmitterService.emitEvent(
        'user-123',
        'task:created',
        'uuid-1',
        { taskId: 'task-1' }
      );

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: event.id }));
    });

    it('should unsubscribe from event type', async () => {
      const handler = vi.fn();
      eventEmitterService.onEvent('task:created', handler);
      eventEmitterService.offEvent('task:created', handler);

      await eventEmitterService.emitEvent('user-123', 'task:created', 'uuid-1', {
        taskId: 'task-1',
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should enforce UNIQUE constraint on (user_id, event_id, event_type)', async () => {
      await eventEmitterService.emitEvent('user-123', 'task:created', 'uuid-456', {
        taskId: 'task-1',
      });

      const duplicate = await eventEmitterService.emitEvent(
        'user-123',
        'task:created',
        'uuid-456',
        { taskId: 'task-1' }
      );

      expect(duplicate.eventId).toBe('uuid-456');
      expect(mockEventStore.eventLogs).toHaveLength(1);
    });
  });

  describe('Integration Tests: WebSocket Handler', () => {
    it('should manage socket connections and subscriptions', () => {
      const connectionHandlers: Array<(socket: any) => void> = [];
      const mockIO = {
        on: vi.fn((event: string, handler: (socket: any) => void) => {
          if (event === 'connection') {
            connectionHandlers.push(handler);
          }
        }),
        sockets: { sockets: new Map() },
        emit: vi.fn(),
      };

      new WebSocketEventHandler(mockIO as any);

      expect(mockIO.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(connectionHandlers).toHaveLength(1);
    });

    it('should validate event type format in subscribe', () => {
      vi.useFakeTimers();

      let connectionHandler: ((socket: any) => void) | undefined;
      const mockSocket = {
        id: 'socket-123',
        on: vi.fn((event: string, handler: (...args: any[]) => void) => {
          if (event === 'subscribe') {
            handler('taskCreated');
          }
        }),
        emit: vi.fn(),
      };
      const mockIO = {
        on: vi.fn((event: string, handler: (socket: any) => void) => {
          if (event === 'connection') {
            connectionHandler = handler;
          }
        }),
        sockets: { sockets: new Map([['socket-123', mockSocket]]) },
      };

      new WebSocketEventHandler(mockIO as any);
      connectionHandler?.(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Invalid event type format');
    });

    it('should maintain heartbeat interval for each socket', () => {
      vi.useFakeTimers();

      let connectionHandler: ((socket: any) => void) | undefined;
      const mockSocket = {
        id: 'socket-123',
        on: vi.fn(),
        emit: vi.fn(),
      };
      const mockIO = {
        on: vi.fn((event: string, handler: (socket: any) => void) => {
          if (event === 'connection') {
            connectionHandler = handler;
          }
        }),
        sockets: { sockets: new Map([['socket-123', mockSocket]]) },
      };

      new WebSocketEventHandler(mockIO as any);
      connectionHandler?.(mockSocket);
      vi.advanceTimersByTime(30000);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'heartbeat',
        expect.objectContaining({ timestamp: expect.any(Number) })
      );
    });
  });

  describe('Integration Tests: Event Cleanup Job', () => {
    it('should soft-delete events older than 90 days', async () => {
      const oldRecord = mockEventStore.seed({
        created_at: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString(),
        deleted_at: null,
      });
      const recentRecord = mockEventStore.seed({
        created_at: new Date().toISOString(),
        deleted_at: null,
      });
      const job = new EventCleanupJob();

      await (job as any).cleanup();

      expect(
        mockEventStore.eventLogs.find((row) => row.id === oldRecord.id)?.deleted_at
      ).toBeTruthy();
      expect(
        mockEventStore.eventLogs.find((row) => row.id === recentRecord.id)?.deleted_at
      ).toBeNull();
    });

    it('should only soft-delete non-deleted events', async () => {
      const preservedDeletedAt = '2026-01-01T00:00:00.000Z';
      const alreadyDeleted = mockEventStore.seed({
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        deleted_at: preservedDeletedAt,
      });
      const activeOldRecord = mockEventStore.seed({
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        deleted_at: null,
      });
      const job = new EventCleanupJob();

      await (job as any).cleanup();

      expect(
        mockEventStore.eventLogs.find((row) => row.id === alreadyDeleted.id)?.deleted_at
      ).toBe(preservedDeletedAt);
      expect(
        mockEventStore.eventLogs.find((row) => row.id === activeOldRecord.id)?.deleted_at
      ).toBeTruthy();
    });
  });

  describe('Integration Tests: Heartbeat Timeout Job', () => {
    it('should detect stale connections after 5+ minutes', () => {
      let connectionHandler: ((socket: any) => void) | undefined;
      const mockSocket = {
        id: 'socket-123',
        on: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockIO = {
        on: vi.fn((event: string, handler: (socket: any) => void) => {
          if (event === 'connection') {
            connectionHandler = handler;
          }
        }),
        sockets: { sockets: new Map([['socket-123', mockSocket]]) },
      };

      const job = new WebSocketHeartbeatTimeoutJob(mockIO as any);
      connectionHandler?.(mockSocket);

      const trackers = (job as any).heartbeatTimeouts as Map<string, { missedCount: number }>;
      trackers.get('socket-123')!.missedCount = 8;
      (job as any).checkHeartbeats();

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('should reset missed count on heartbeat ACK', () => {
      let ackHandler: (() => void) | undefined;
      const mockSocket = {
        id: 'socket-123',
        on: vi.fn((event: string, handler: () => void) => {
          if (event === 'heartbeat_ack') {
            ackHandler = handler;
          }
        }),
      };
      const mockIO = {
        on: vi.fn((event: string, handler: (socket: any) => void) => {
          if (event === 'connection') {
            handler(mockSocket);
          }
        }),
        sockets: { sockets: new Map([['socket-123', mockSocket]]) },
      };

      const job = new WebSocketHeartbeatTimeoutJob(mockIO as any);
      const trackers = (job as any).heartbeatTimeouts as Map<string, { missedCount: number }>;
      trackers.get('socket-123')!.missedCount = 6;

      ackHandler?.();

      expect(trackers.get('socket-123')?.missedCount).toBe(0);
    });
  });
});
