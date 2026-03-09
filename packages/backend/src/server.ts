import type { Server } from 'http';
import type { Job } from 'node-schedule';
import { assertRequiredEnv } from './config/env';
import type { ExecutionWebSocketServer } from './websocket/websocket-server';

const PORT = process.env.PORT || 3001;

function setupGracefulShutdown(
  server: Server,
  wsServer?: ExecutionWebSocketServer,
  costSnapshotJob?: Job
): void {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`${signal} received, shutting down gracefully...`);

    if (wsServer) {
      await wsServer.shutdown();
    }

    if (costSnapshotJob) {
      costSnapshotJob.cancel();
    }

    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

async function startServer(): Promise<void> {
  try {
    assertRequiredEnv();

    const [
      { default: app },
      { supabase },
      { ExecutionHistoryService },
      { DeltaDetector },
      { initializeWebSocketServer },
      { initNightlyCostSnapshotJob },
      { CostSnapshotService },
    ] =
      await Promise.all([
        import('./app'),
        import('./lib/supabase'),
        import('./automations/history/history.service'),
        import('./websocket/delta-detector'),
        import('./websocket/websocket-server'),
        import('./jobs/nightly-cost-snapshot'),
        import('./services/cost-snapshot.service'),
      ]);

    const executionHistoryService = new ExecutionHistoryService(supabase as any);
    const deltaDetector = new DeltaDetector(executionHistoryService);
    const server = app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });

    const wsServer = await initializeWebSocketServer(undefined, {
      deltaDetector,
    });
    const costSnapshotJob = initNightlyCostSnapshotJob(
      supabase as any,
      new CostSnapshotService(supabase as any)
    );

    console.log(
      `✓ WebSocket server running on ws://localhost:${process.env.WEBSOCKET_PORT || '9001'}${
        process.env.WEBSOCKET_PATH || '/ws'
      }`
    );
    console.log(`✓ Nightly cost snapshot job active (${process.env.COST_JOB_SCHEDULE || '0 2 * * *'})`);

    setupGracefulShutdown(server, wsServer, costSnapshotJob);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[startup] Failed to initialize backend: ${message}`);
    process.exit(1);
  }
}

void startServer();
