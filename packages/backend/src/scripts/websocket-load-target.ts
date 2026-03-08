import { DeltaDetector } from '../websocket/delta-detector';
import { ExecutionWebSocketServer } from '../websocket/websocket-server';

interface SyntheticDelta {
  execution_id: string;
  changes: {
    status: string;
    duration: number;
    updated_at: string;
  };
  updated_at: string;
  timestamp: string;
}

class SyntheticDeltaDetector {
  private readonly publishEveryMs: number;
  private readonly lastPublishedAt = new Map<string, number>();
  private readonly sequenceByUser = new Map<string, number>();

  constructor(publishEveryMs: number) {
    this.publishEveryMs = publishEveryMs;
  }

  async detectDeltas(userId: string): Promise<SyntheticDelta[]> {
    const now = Date.now();
    const lastPublishedAt = this.lastPublishedAt.get(userId) ?? 0;

    if (now - lastPublishedAt < this.publishEveryMs) {
      return [];
    }

    const sequence = (this.sequenceByUser.get(userId) ?? 0) + 1;
    this.sequenceByUser.set(userId, sequence);
    this.lastPublishedAt.set(userId, now);

    const timestamp = new Date(now).toISOString();

    return [
      {
        execution_id: `load-${userId}-${sequence}`,
        changes: {
          status: sequence % 2 === 0 ? 'completed' : 'running',
          duration: sequence * 10,
          updated_at: timestamp,
        },
        updated_at: timestamp,
        timestamp,
      },
    ];
  }

  validateDeltaSize(delta: SyntheticDelta): boolean {
    const sizeBytes = Buffer.byteLength(
      JSON.stringify({
        type: 'execution-update',
        data: delta,
        timestamp: new Date().toISOString(),
      })
    );

    return sizeBytes <= 1024;
  }
}

async function main(): Promise<void> {
  const port = Number(process.env.WS_LOAD_TARGET_PORT || '9401');
  const path = process.env.WS_LOAD_TARGET_PATH || '/ws';
  const publishEveryMs = Number(process.env.WS_LOAD_TARGET_PUBLISH_EVERY_MS || '1000');
  const heartbeatInterval = Number(process.env.WS_LOAD_TARGET_HEARTBEAT_MS || '30000');
  const idleTimeout = Number(process.env.WS_LOAD_TARGET_IDLE_TIMEOUT_MS || '300000');

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'load-test-secret';

  const deltaDetector = new SyntheticDeltaDetector(publishEveryMs);
  const server = new ExecutionWebSocketServer(
    {
      port,
      path,
      updateInterval: publishEveryMs,
      heartbeatInterval,
      idleTimeout,
      redisEnabled: false,
      corsOrigins: ['*'],
      rateLimit: {
        messagesPerSecond: 50,
        windowMs: 1000,
      },
    },
    {
      deltaDetector: deltaDetector as unknown as DeltaDetector,
    }
  );

  await server.initialize();

  const shutdown = async (signal: string) => {
    console.log(`[load-target] ${signal} received, shutting down`);
    await server.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  console.log(
    JSON.stringify({
      type: 'LOAD_TARGET_READY',
      port,
      path,
      publishEveryMs,
      pid: process.pid,
      startedAt: new Date().toISOString(),
    })
  );
}

void main().catch((error) => {
  console.error('[load-target] failed to start', error);
  process.exit(1);
});
