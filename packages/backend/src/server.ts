import type { Server } from 'http';
import { assertRequiredEnv } from './config/env';

const PORT = process.env.PORT || 3001;

function setupGracefulShutdown(server: Server): void {
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

async function startServer(): Promise<void> {
  try {
    assertRequiredEnv();

    const { default: app } = await import('./app');
    const server = app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });

    setupGracefulShutdown(server);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[startup] Failed to initialize backend: ${message}`);
    process.exit(1);
  }
}

void startServer();
