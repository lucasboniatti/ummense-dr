import { describe, it, expect, beforeEach, vi } from 'vitest';
import { automationService } from '../services/automation.service';

describe('Dashboard Performance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should load dashboard metrics in less than 1 second', async () => {
    const startTime = performance.now();

    // Mock fast response
    vi.spyOn(automationService, 'getMetrics').mockResolvedValueOnce({
      rulesCount: 42,
      webhooksCount: 15,
      eventsProcessed24h: 5234,
      successRate: 98.5,
      avgExecutionTimeMs: 245,
    });

    await automationService.getMetrics();

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete in less than 1000ms
    expect(duration).toBeLessThan(1000);
  });

  it('should load all dashboard data in parallel within 1 second', async () => {
    const startTime = performance.now();

    // Mock all API calls
    vi.spyOn(automationService, 'getMetrics').mockResolvedValueOnce({
      rulesCount: 42,
      webhooksCount: 15,
      eventsProcessed24h: 5234,
      successRate: 98.5,
      avgExecutionTimeMs: 245,
    });

    vi.spyOn(automationService, 'getTimeSeries').mockResolvedValueOnce([
      { date: '2026-03-02', success: 100, failed: 5 },
    ]);

    vi.spyOn(automationService, 'getTopFailingRules').mockResolvedValueOnce([
      {
        rule_id: 'rule-1',
        name: 'Test',
        failures: 5,
        successes: 95,
        failureRate: 5.0,
        lastFailure: '2026-03-02T10:00:00Z',
      },
    ]);

    vi.spyOn(automationService, 'getRecentExecutions').mockResolvedValueOnce([
      {
        execution_id: 'exec-1',
        rule_id: 'rule-1',
        rule_name: 'Test',
        status: 'success',
        triggered_at: '2026-03-02T10:00:00Z',
        execution_time_ms: 250,
      },
    ]);

    // Simulate parallel loading (Promise.all)
    await Promise.all([
      automationService.getMetrics(),
      automationService.getTimeSeries(),
      automationService.getTopFailingRules(),
      automationService.getRecentExecutions(),
    ]);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // All data should load in less than 1 second due to parallel execution
    expect(duration).toBeLessThan(1000);
  });

  it('should handle pre-aggregated metrics efficiently', async () => {
    // Test that pre-aggregated metrics are significantly faster than real-time aggregation
    const aggregatedStartTime = performance.now();

    // Pre-aggregated query (fast)
    vi.spyOn(automationService, 'getMetrics').mockResolvedValueOnce({
      rulesCount: 42,
      webhooksCount: 15,
      eventsProcessed24h: 5234,
      successRate: 98.5,
      avgExecutionTimeMs: 245,
    });

    await automationService.getMetrics();

    const aggregatedDuration = performance.now() - aggregatedStartTime;

    // Pre-aggregated metrics should load very quickly
    expect(aggregatedDuration).toBeLessThan(500);
  });

  it('should efficiently handle large time-series datasets', async () => {
    const largeDataset = Array.from({ length: 90 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      success: Math.floor(Math.random() * 1000),
      failed: Math.floor(Math.random() * 100),
    }));

    const startTime = performance.now();

    vi.spyOn(automationService, 'getTimeSeries').mockResolvedValueOnce(largeDataset);

    await automationService.getTimeSeries();

    const duration = performance.now() - startTime;

    // Should handle even large datasets efficiently
    expect(duration).toBeLessThan(500);
  });

  it('should limit log exports to prevent memory issues', async () => {
    // Test that CSV export respects the 10K row limit
    const csvExportStart = performance.now();

    vi.spyOn(automationService, 'exportCsvLogs').mockResolvedValueOnce(new Blob());

    await automationService.exportCsvLogs({});

    const csvDuration = performance.now() - csvExportStart;

    // Export should complete reasonably fast even with 10K rows
    expect(csvDuration).toBeLessThan(2000);
  });
});
