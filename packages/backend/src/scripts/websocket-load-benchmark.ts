import { execFile as execFileCallback, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';

const execFile = promisify(execFileCallback);

type ServerSample = {
  timestamp: string;
  memoryRssMb: number;
  cpuPercent: number;
};

type ClientState = {
  clientId: number;
  userId: string;
  socket: WebSocket;
  connected: boolean;
  subscribed: boolean;
  plannedClose: boolean;
};

type BenchmarkReport = {
  generatedAt: string;
  target: {
    port: number;
    path: string;
    pid: number;
  };
  config: {
    concurrentClients: number;
    durationSeconds: number;
    warmupSeconds: number;
    connectionTimeoutMs: number;
    sampleIntervalMs: number;
    publishEveryMs: number;
    uniqueUsers: boolean;
  };
  summary: {
    connectionAttempts: number;
    successfulConnections: number;
    connectionSuccessRate: number;
    unexpectedDisconnects: number;
    totalMessages: number;
    latencyP50Ms: number;
    latencyP95Ms: number;
    latencyP99Ms: number;
    baselineMemoryRssMb: number;
    peakMemoryRssMb: number;
    memoryDeltaMb: number;
    finalMemoryRssMb: number;
    cpuAveragePercent: number;
    cpuPeakPercent: number;
    messageRatePerSecond: number;
  };
  thresholds: {
    minConnectionSuccessRate: number;
    maxLatencyP95Ms: number;
    maxMemoryDeltaMb: number;
    maxCpuAveragePercent: number;
  };
  pass: boolean;
  notes: string[];
  samples: ServerSample[];
};

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1)
  );

  return Number(sorted[index].toFixed(2));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Number((values.reduce((acc, value) => acc + value, 0) / values.length).toFixed(2));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sampleProcess(pid: number): Promise<ServerSample> {
  const { stdout } = await execFile('ps', ['-o', 'rss=,%cpu=', '-p', String(pid)]);
  const [rssRaw = '0', cpuRaw = '0'] = stdout.trim().split(/\s+/);

  return {
    timestamp: new Date().toISOString(),
    memoryRssMb: Number((Number(rssRaw) / 1024).toFixed(2)),
    cpuPercent: Number(Number(cpuRaw).toFixed(2)),
  };
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const backendRoot = path.resolve(scriptDir, '../..');
  const repoRoot = path.resolve(backendRoot, '../..');
  const concurrentClients = Number(process.env.WS_BENCHMARK_CLIENTS || '100');
  const durationSeconds = Number(process.env.WS_BENCHMARK_DURATION_SECONDS || '3600');
  const warmupSeconds = Number(process.env.WS_BENCHMARK_WARMUP_SECONDS || '30');
  const sampleIntervalMs = Number(process.env.WS_BENCHMARK_SAMPLE_INTERVAL_MS || '5000');
  const connectionTimeoutMs = Number(process.env.WS_BENCHMARK_CONNECTION_TIMEOUT_MS || '10000');
  const port = Number(process.env.WS_LOAD_TARGET_PORT || '9401');
  const pathName = process.env.WS_LOAD_TARGET_PATH || '/ws';
  const publishEveryMs = Number(process.env.WS_LOAD_TARGET_PUBLISH_EVERY_MS || '1000');
  const uniqueUsers = process.env.WS_BENCHMARK_UNIQUE_USERS !== 'false';
  const jwtSecret = process.env.JWT_SECRET || 'load-test-secret';
  const reportDir = path.resolve(repoRoot, process.env.WS_BENCHMARK_REPORT_DIR || 'docs/qa/evidence/epic-3');
  const reportJsonPath = path.join(reportDir, 'websocket-load-report.json');
  const reportMarkdownPath = path.join(reportDir, 'websocket-load-report.md');

  await ensureDir(reportDir);

  const targetProcess = spawn(
    'npx',
    ['tsx', path.join(repoRoot, 'packages/backend/src/scripts/websocket-load-target.ts')],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        JWT_SECRET: jwtSecret,
        WS_LOAD_TARGET_PORT: String(port),
        WS_LOAD_TARGET_PATH: pathName,
        WS_LOAD_TARGET_PUBLISH_EVERY_MS: String(publishEveryMs),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let targetPid = 0;
  let readyPayload: { pid: number; port: number; path: string } | null = null;
  let stderrBuffer = '';

  targetProcess.stderr.setEncoding('utf8');
  targetProcess.stderr.on('data', (chunk) => {
    stderrBuffer += chunk;
    process.stderr.write(chunk);
  });

  const readyPromise = new Promise<void>((resolve, reject) => {
    targetProcess.stdout.setEncoding('utf8');
    targetProcess.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) {
          continue;
        }

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.type === 'LOAD_TARGET_READY') {
            readyPayload = parsed;
            targetPid = parsed.pid;
            resolve();
          }
        } catch {
          // Ignore non-JSON log lines.
        }
      }
    });

    targetProcess.once('exit', (code) => {
      if (!readyPayload) {
        reject(new Error(`Load target exited before ready with code ${code}\n${stderrBuffer}`));
      }
    });
  });

  await readyPromise;

  if (!readyPayload || !targetPid) {
    throw new Error('Load target did not expose readiness metadata');
  }

  const baselineSample = await sampleProcess(targetPid);
  const samples: ServerSample[] = [baselineSample];
  const latenciesMs: number[] = [];
  const notes: string[] = [];
  let totalMessages = 0;
  let successfulConnections = 0;
  let unexpectedDisconnects = 0;
  let plannedShutdown = false;
  let measurementStartsAt = Number.POSITIVE_INFINITY;

  const clients: ClientState[] = [];

  const monitorHandle = setInterval(() => {
    void sampleProcess(targetPid)
      .then((sample) => {
        samples.push(sample);
      })
      .catch((error) => {
        notes.push(`Failed to sample target process: ${String(error)}`);
      });
  }, sampleIntervalMs);

  const connectClient = async (clientId: number): Promise<void> => {
    const userId = uniqueUsers ? `load-user-${clientId}` : 'load-user-shared';
    const token = jwt.sign({ id: userId }, jwtSecret, { expiresIn: '2h' });
    const wsUrl = `ws://127.0.0.1:${port}${pathName}?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(wsUrl);

    const clientState: ClientState = {
      clientId,
      userId,
      socket,
      connected: false,
      subscribed: false,
      plannedClose: false,
    };
    clients.push(clientState);

    const connectionPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Client ${clientId} timed out after ${connectionTimeoutMs}ms`));
      }, connectionTimeoutMs);

      socket.on('open', () => {
        clientState.connected = true;
        socket.send(JSON.stringify({ type: 'subscribe', channel: `execution-updates:${userId}` }));
      });

      socket.on('message', (rawData) => {
        const payload = JSON.parse(rawData.toString()) as {
          type: string;
          data?: { timestamp?: string; updated_at?: string };
        };

        if (payload.type === 'subscribed' && !clientState.subscribed) {
          clientState.subscribed = true;
          successfulConnections += 1;
          clearTimeout(timeout);
          resolve();
          return;
        }

        if (payload.type === 'execution-update' && Date.now() >= measurementStartsAt) {
          totalMessages += 1;
          const eventTimestamp = payload.data?.timestamp || payload.data?.updated_at;
          if (eventTimestamp) {
            latenciesMs.push(Date.now() - Date.parse(eventTimestamp));
          }
        }
      });

      socket.on('close', () => {
        if (!clientState.plannedClose && !plannedShutdown) {
          unexpectedDisconnects += 1;
        }
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    await connectionPromise;
  };

  try {
    await Promise.all(Array.from({ length: concurrentClients }, (_, index) => connectClient(index + 1)));

    if (warmupSeconds > 0) {
      console.log(`[benchmark] warmup=${warmupSeconds}s before sustained measurement`);
      await wait(warmupSeconds * 1000);
    }

    measurementStartsAt = Date.now();
    const startedAt = measurementStartsAt;
    const logEveryMs = 30_000;
    let nextLogAt = startedAt + logEveryMs;
    const finishAt = startedAt + durationSeconds * 1000;

    while (Date.now() < finishAt) {
      const remainingMs = finishAt - Date.now();
      if (Date.now() >= nextLogAt) {
        const connectedClients = clients.filter((client) => client.connected && client.socket.readyState === WebSocket.OPEN).length;
        console.log(
          `[benchmark] active=${connectedClients}/${concurrentClients} messages=${totalMessages} p95=${percentile(latenciesMs, 95)}ms remaining=${Math.ceil(remainingMs / 1000)}s`
        );
        nextLogAt += logEveryMs;
      }

      await wait(Math.min(1000, remainingMs));
    }
  } finally {
    plannedShutdown = true;
    clearInterval(monitorHandle);

    await Promise.all(
      clients.map(
        (client) =>
          new Promise<void>((resolve) => {
            if (client.socket.readyState === WebSocket.CLOSED) {
              resolve();
              return;
            }

            client.plannedClose = true;
            client.socket.once('close', () => resolve());
            client.socket.close();
            setTimeout(resolve, 1000);
          })
      )
    );

    const finalSample = await sampleProcess(targetPid).catch(() => baselineSample);
    samples.push(finalSample);

    targetProcess.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      targetProcess.once('exit', () => resolve());
    });
  }

  const baselineMemoryRssMb = baselineSample.memoryRssMb;
  const peakMemoryRssMb = Math.max(...samples.map((sample) => sample.memoryRssMb));
  const finalMemoryRssMb = samples[samples.length - 1]?.memoryRssMb ?? baselineMemoryRssMb;
  const sustainedSamples = samples.filter(
    (sample) => Date.parse(sample.timestamp) >= measurementStartsAt
  );
  const cpuSamples = sustainedSamples.length > 0 ? sustainedSamples : samples.slice(1);
  const cpuAveragePercent = average(cpuSamples.map((sample) => sample.cpuPercent));
  const cpuPeakPercent = Number(Math.max(...cpuSamples.map((sample) => sample.cpuPercent)).toFixed(2));
  const connectionSuccessRate = Number((successfulConnections / concurrentClients).toFixed(4));
  const messageRatePerSecond = Number((totalMessages / Math.max(durationSeconds, 1)).toFixed(2));

  const report: BenchmarkReport = {
    generatedAt: new Date().toISOString(),
    target: {
      port,
      path: pathName,
      pid: targetPid,
    },
    config: {
      concurrentClients,
      durationSeconds,
      warmupSeconds,
      connectionTimeoutMs,
      sampleIntervalMs,
      publishEveryMs,
      uniqueUsers,
    },
    summary: {
      connectionAttempts: concurrentClients,
      successfulConnections,
      connectionSuccessRate,
      unexpectedDisconnects,
      totalMessages,
      latencyP50Ms: percentile(latenciesMs, 50),
      latencyP95Ms: percentile(latenciesMs, 95),
      latencyP99Ms: percentile(latenciesMs, 99),
      baselineMemoryRssMb,
      peakMemoryRssMb,
      memoryDeltaMb: Number((peakMemoryRssMb - baselineMemoryRssMb).toFixed(2)),
      finalMemoryRssMb,
      cpuAveragePercent,
      cpuPeakPercent,
      messageRatePerSecond,
    },
    thresholds: {
      minConnectionSuccessRate: 0.99,
      maxLatencyP95Ms: 500,
      maxMemoryDeltaMb: 100,
      maxCpuAveragePercent: 5,
    },
    pass: false,
    notes,
    samples,
  };

  report.pass =
    report.summary.connectionSuccessRate >= report.thresholds.minConnectionSuccessRate &&
    report.summary.latencyP95Ms <= report.thresholds.maxLatencyP95Ms &&
    report.summary.memoryDeltaMb <= report.thresholds.maxMemoryDeltaMb &&
    report.summary.cpuAveragePercent <= report.thresholds.maxCpuAveragePercent &&
    report.summary.unexpectedDisconnects === 0;

  const markdown = [
    '# WebSocket Load Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Duration: ${report.config.durationSeconds}s`,
    `- Concurrent clients: ${report.config.concurrentClients}`,
    `- Unique users: ${report.config.uniqueUsers ? 'yes' : 'no'}`,
    `- Target: ws://127.0.0.1:${report.target.port}${report.target.path}`,
    '',
    '## Summary',
    '',
    `- Pass: ${report.pass ? 'yes' : 'no'}`,
    `- Connection success rate: ${(report.summary.connectionSuccessRate * 100).toFixed(2)}%`,
    `- Unexpected disconnects: ${report.summary.unexpectedDisconnects}`,
    `- Messages received: ${report.summary.totalMessages}`,
    `- Message rate: ${report.summary.messageRatePerSecond}/s`,
    `- Latency p50: ${report.summary.latencyP50Ms}ms`,
    `- Latency p95: ${report.summary.latencyP95Ms}ms`,
    `- Latency p99: ${report.summary.latencyP99Ms}ms`,
    `- Baseline RSS: ${report.summary.baselineMemoryRssMb}MB`,
    `- Peak RSS: ${report.summary.peakMemoryRssMb}MB`,
    `- Memory delta: ${report.summary.memoryDeltaMb}MB`,
    `- Final RSS: ${report.summary.finalMemoryRssMb}MB`,
    `- CPU average: ${report.summary.cpuAveragePercent}%`,
    `- CPU peak: ${report.summary.cpuPeakPercent}%`,
    '',
    '## Thresholds',
    '',
    `- Connection success rate >= ${(report.thresholds.minConnectionSuccessRate * 100).toFixed(0)}%`,
    `- Latency p95 <= ${report.thresholds.maxLatencyP95Ms}ms`,
    `- Memory delta <= ${report.thresholds.maxMemoryDeltaMb}MB`,
    `- CPU average <= ${report.thresholds.maxCpuAveragePercent}%`,
    '',
    '## Notes',
    '',
    ...(report.notes.length > 0 ? report.notes.map((note) => `- ${note}`) : ['- No extra notes.']),
    '',
  ].join('\n');

  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(reportMarkdownPath, markdown, 'utf8');

  console.log(`[benchmark] report json: ${reportJsonPath}`);
  console.log(`[benchmark] report md: ${reportMarkdownPath}`);
  console.log(`[benchmark] pass=${report.pass} p95=${report.summary.latencyP95Ms}ms memoryDelta=${report.summary.memoryDeltaMb}MB cpuAvg=${report.summary.cpuAveragePercent}%`);

  if (!report.pass) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error('[benchmark] failed', error);
  process.exit(1);
});
