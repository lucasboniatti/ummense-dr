import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../../..');
const reportPath = path.join(repoRoot, 'docs/qa/evidence/epic-3/websocket-load-report.json');
const hasReport = fs.existsSync(reportPath);

describe('WebSocket Load Report', () => {
  const run = hasReport ? it : it.skip;

  run('valida o ultimo benchmark sustentado gravado no repo', async () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      pass: boolean;
      config: { concurrentClients: number; durationSeconds: number };
      summary: {
        connectionSuccessRate: number;
        latencyP95Ms: number;
        memoryDeltaMb: number;
        cpuAveragePercent: number;
        unexpectedDisconnects: number;
      };
      thresholds: {
        minConnectionSuccessRate: number;
        maxLatencyP95Ms: number;
        maxMemoryDeltaMb: number;
        maxCpuAveragePercent: number;
      };
    };

    expect(report.config.concurrentClients).toBeGreaterThanOrEqual(100);
    expect(report.config.durationSeconds).toBeGreaterThanOrEqual(3600);
    expect(report.summary.connectionSuccessRate).toBeGreaterThanOrEqual(
      report.thresholds.minConnectionSuccessRate
    );
    expect(report.summary.latencyP95Ms).toBeLessThanOrEqual(
      report.thresholds.maxLatencyP95Ms
    );
    expect(report.summary.memoryDeltaMb).toBeLessThanOrEqual(
      report.thresholds.maxMemoryDeltaMb
    );
    expect(report.summary.cpuAveragePercent).toBeLessThanOrEqual(
      report.thresholds.maxCpuAveragePercent
    );
    expect(report.summary.unexpectedDisconnects).toBe(0);
    expect(report.pass).toBe(true);
  });
});
