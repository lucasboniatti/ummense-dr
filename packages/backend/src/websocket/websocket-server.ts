import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { Redis } from 'redis';
import { authenticateUser } from '../services/auth.service';
import { logger } from '../utils/logger';

interface WSClient {
  ws: WebSocket;
  userId: string;
  channel: string;
  heartbeat: NodeJS.Timer;
  lastActivity: number;
}

export class ExecutionWebSocketServer {
  private wss: WebSocketServer;
  private httpServer: any;
  private clients = new Map<string, WSClient>();
  private redisSubscriber: Redis | null = null;
  private redisPublisher: Redis | null = null;
  private inMemorySubscriptions = new Map<string, Set<string>>();
  private config: {
    port: number;
    heartbeatInterval: number;
    idleTimeout: number;
    redisEnabled: boolean;
    redisUrl: string;
  };

  constructor(config?: Partial<typeof ExecutionWebSocketServer.prototype.config>) {
    this.config = {
      port: parseInt(process.env.WEBSOCKET_PORT || '9001'),
      heartbeatInterval: parseInt(process.env.WEBSOCKET_HEARTBEAT || '30000'),
      idleTimeout: parseInt(process.env.WEBSOCKET_IDLE_TIMEOUT || '300000'),
      redisEnabled: process.env.REDIS_ENABLED === 'true',
      redisUrl: process.env.REDIS_URL || 'redis://localhost',
      ...config,
    };

    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });
  }

  async initialize(): Promise<void> {
    // Initialize Redis if enabled
    if (this.config.redisEnabled) {
      try {
        const redis = require('redis');
        this.redisSubscriber = redis.createClient({ url: this.config.redisUrl });
        this.redisPublisher = redis.createClient({ url: this.config.redisUrl });

        await this.redisSubscriber.connect();
        await this.redisPublisher.connect();

        logger.info('[WebSocket] Redis connected for pub/sub');
      } catch (error) {
        logger.error('[WebSocket] Redis connection failed, falling back to in-memory:', error);
        this.config.redisEnabled = false;
      }
    }

    // Setup WebSocket connection handler
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

    // Setup idle timeout check
    setInterval(() => this.checkIdleConnections(), this.config.idleTimeout / 2);

    // Start HTTP server
    this.httpServer.listen(this.config.port, () => {
      logger.info(`[WebSocket] Server listening on port ${this.config.port}`);
    });
  }

  private async handleConnection(ws: WebSocket, req: any): Promise<void> {
    try {
      // Authenticate user from JWT token
      const userId = await authenticateUser(req);
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      const channel = `execution-updates:${userId}`;
      const clientId = `${userId}-${Date.now()}-${Math.random()}`;

      // Create client record
      const client: WSClient = {
        ws,
        userId,
        channel,
        heartbeat: setInterval(() => ws.ping(), this.config.heartbeatInterval),
        lastActivity: Date.now(),
      };

      this.clients.set(clientId, client);
      logger.info(`[WebSocket] Client connected: ${clientId} (channel: ${channel})`);

      // Subscribe to updates
      if (this.config.redisEnabled && this.redisSubscriber) {
        await this.redisSubscriber.subscribe(channel, (message: string) => {
          this.broadcastToUser(userId, message);
        });
      } else {
        // In-memory fallback
        if (!this.inMemorySubscriptions.has(channel)) {
          this.inMemorySubscriptions.set(channel, new Set());
        }
        this.inMemorySubscriptions.get(channel)!.add(clientId);
      }

      // Handle messages from client
      ws.on('message', (data: Buffer) => {
        client.lastActivity = Date.now();
        logger.debug(`[WebSocket] Message from ${clientId}:`, data.toString());
      });

      // Handle pong (heartbeat response)
      ws.on('pong', () => {
        client.lastActivity = Date.now();
      });

      // Handle disconnect
      ws.on('close', () => {
        this.handleDisconnect(clientId, client);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`[WebSocket] Error for ${clientId}:`, error);
        this.handleDisconnect(clientId, client);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        channel,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('[WebSocket] Connection error:', error);
      ws.close(1011, 'Server error');
    }
  }

  private handleDisconnect(clientId: string, client: WSClient): void {
    this.clients.delete(clientId);
    clearInterval(client.heartbeat);

    if (!this.config.redisEnabled) {
      const subscribers = this.inMemorySubscriptions.get(client.channel);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.inMemorySubscriptions.delete(client.channel);
        }
      }
    }

    logger.info(`[WebSocket] Client disconnected: ${clientId}`);
  }

  private checkIdleConnections(): void {
    const now = Date.now();
    const timeout = this.config.idleTimeout;

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastActivity > timeout) {
        logger.warn(`[WebSocket] Closing idle connection: ${clientId}`);
        client.ws.close(1000, 'Idle timeout');
        this.handleDisconnect(clientId, client);
      }
    }
  }

  async publishDelta(userId: string, delta: any): Promise<void> {
    const channel = `execution-updates:${userId}`;
    const message = JSON.stringify({
      type: 'execution-update',
      data: delta,
      timestamp: new Date().toISOString(),
    });

    if (this.config.redisEnabled && this.redisPublisher) {
      try {
        await this.redisPublisher.publish(channel, message);
      } catch (error) {
        logger.error(`[WebSocket] Failed to publish via Redis: ${channel}`, error);
        // Fallback to in-memory
        this.broadcastToUser(userId, message);
      }
    } else {
      this.broadcastToUser(userId, message);
    }
  }

  private broadcastToUser(userId: string, message: string): void {
    const channel = `execution-updates:${userId}`;
    let count = 0;

    for (const [, client] of this.clients.entries()) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
        count++;
      }
    }

    if (count > 0) {
      logger.debug(`[WebSocket] Broadcasted to ${count} clients on ${channel}`);
    }
  }

  async shutdown(timeout: number = 30000): Promise<void> {
    logger.info('[WebSocket] Shutting down gracefully...');

    // Close all connections with timeout
    const closePromises = Array.from(this.clients.values()).map(
      (client) =>
        new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            client.ws.terminate();
            resolve();
          }, timeout / this.clients.size);

          client.ws.close(1001, 'Server shutting down');
          client.ws.once('close', () => {
            clearTimeout(timer);
            resolve();
          });
        })
    );

    await Promise.all(closePromises);

    // Cleanup Redis
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
    }
    if (this.redisPublisher) {
      await this.redisPublisher.quit();
    }

    this.httpServer.close();
    logger.info('[WebSocket] Server shut down complete');
  }

  // Metrics for monitoring
  getMetrics() {
    return {
      activeConnections: this.clients.size,
      channels: this.inMemorySubscriptions.size,
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instance
let wsServer: ExecutionWebSocketServer | null = null;

export async function initializeWebSocketServer(config?: any): Promise<ExecutionWebSocketServer> {
  if (!wsServer) {
    wsServer = new ExecutionWebSocketServer(config);
    await wsServer.initialize();
  }
  return wsServer;
}

export function getWebSocketServer(): ExecutionWebSocketServer {
  if (!wsServer) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocketServer first.');
  }
  return wsServer;
}
