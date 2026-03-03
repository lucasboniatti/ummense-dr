import { ExecutionHistoryService } from '../automations/history/history.service';
import { createClient } from '@supabase/supabase-js';

describe('ExecutionHistoryService', () => {
  let service: ExecutionHistoryService;
  let mockDb: any;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockAutomationId = '223e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockDb = {
      from: jest.fn(),
    };

    service = new ExecutionHistoryService(mockDb);
  });

  describe('queryExecutionHistory', () => {
    it('should query execution history with default pagination', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [{ id: '123', status: 'success' }],
          count: 1,
          error: null,
        }),
      };

      mockDb.from.mockReturnValue(mockChain);

      const result = await service.queryExecutionHistory({
        userId: mockUserId,
      });

      expect(result).toEqual({
        executions: [{ id: '123', status: 'success' }],
        total: 1,
        limit: 50,
        offset: 0,
      });
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should filter by automation_id', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      };

      mockDb.from.mockReturnValue(mockChain);

      await service.queryExecutionHistory({
        userId: mockUserId,
        automationId: mockAutomationId,
      });

      expect(mockChain.eq).toHaveBeenCalledWith('automation_id', mockAutomationId);
    });

    it('should filter by status', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      };

      mockDb.from.mockReturnValue(mockChain);

      await service.queryExecutionHistory({
        userId: mockUserId,
        status: 'failed',
      });

      const calls = mockChain.eq.mock.calls;
      expect(calls.some((call) => call[0] === 'status' && call[1] === 'failed')).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], count: 100, error: null }),
      };

      mockDb.from.mockReturnValue(mockChain);

      await service.queryExecutionHistory({
        userId: mockUserId,
        limit: 20,
        offset: 40,
      });

      expect(mockChain.range).toHaveBeenCalledWith(40, 59);
    });
  });

  describe('getExecutionDetail', () => {
    it('should fetch execution detail with steps', async () => {
      const executionId = '333e4567-e89b-12d3-a456-426614174000';

      const mockExecChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: executionId, status: 'success' },
          error: null,
        }),
      };

      const mockStepsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 'step1', step_id: 'step_1' }],
          error: null,
        }),
      };

      mockDb.from
        .mockReturnValueOnce(mockExecChain)
        .mockReturnValueOnce(mockStepsChain);

      const result = await service.getExecutionDetail(executionId, mockUserId);

      expect(result.execution.id).toBe(executionId);
      expect(result.steps.length).toBe(1);
    });
  });

  describe('exportAsCSV', () => {
    it('should export execution history as CSV', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [
            {
              id: '123',
              automation_name: 'Test',
              status: 'success',
              trigger_type: 'manual',
              started_at: '2026-03-03T10:00:00Z',
              duration_ms: 1000,
              error_context: null,
              automations: { name: 'Test' },
            },
          ],
          count: 1,
          error: null,
        }),
      };

      mockDb.from.mockReturnValue(mockChain);

      const csv = await service.exportAsCSV({
        userId: mockUserId,
      });

      expect(csv).toContain('Execution ID');
      expect(csv).toContain('123');
      expect(csv).toContain('success');
    });
  });

  describe('exportAsJSON', () => {
    it('should export execution history as JSON', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [{ id: '123', status: 'success' }],
          count: 1,
          error: null,
        }),
      };

      mockDb.from.mockReturnValue(mockChain);

      const json = await service.exportAsJSON({
        userId: mockUserId,
      });

      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].id).toBe('123');
    });
  });

  describe('logAuditAction', () => {
    it('should log audit action', async () => {
      const mockChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockDb.from.mockReturnValue(mockChain);

      await service.logAuditAction(
        mockUserId,
        'modify_automation',
        mockAutomationId,
        { old: { name: 'Old' }, new: { name: 'New' } },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(mockChain.insert).toHaveBeenCalled();
    });
  });

  describe('getUserRetentionPolicy', () => {
    it('should fetch existing retention policy', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { retention_days: 90, archive_enabled: false },
          error: null,
        }),
      };

      mockDb.from.mockReturnValue(mockChain);

      const policy = await service.getUserRetentionPolicy(mockUserId);

      expect(policy.retention_days).toBe(90);
    });
  });

  describe('updateRetentionPolicy', () => {
    it('should update retention policy', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { retention_days: 180, archive_enabled: true },
          error: null,
        }),
      };

      mockDb.from.mockReturnValue(mockChain);

      const updated = await service.updateRetentionPolicy(mockUserId, 180, true);

      expect(updated.retention_days).toBe(180);
      expect(updated.archive_enabled).toBe(true);
    });
  });
});
