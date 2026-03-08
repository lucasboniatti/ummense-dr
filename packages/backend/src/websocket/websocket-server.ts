import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { authenticateUser } from '../services/auth.service';
import { logger } from '../utils/logger';
import { DeltaDetector } from './delta-detector';

interface WSClient {
  ws: WebSocket;
  userId: string;
  channel: string;
  heartbeat: NodeJS.Timeout;
  lastActivity: number;
}

interface WebSocketDependencies {
  deltaDetector?: DeltaDetector;
}

// Circuit breaker state machine
enum CircuitState {
  CLOSED = 'closed',      // Accepting requests
  OPEN = 'open',          // Rejecting requests
  HALF_OPEN = 'half-open' // Testing recovery
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

class RedisCircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        logger.info('[CircuitBreaker] Circuit closed - Redis recovered');
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    this.successCount = 0;

    if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      logger.warn(`[CircuitBreaker] Circuit open - Redis failed ${this.failureCount} times`);
      this.state = CircuitState.OPEN;
    }
  }

  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.timeout) {
        logger.info('[CircuitBreaker] Circuit half-open - testing Redis recovery');
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow single attempt
    return true;
  }

  getState(): CircuitState {
    return this.state;
  }
}

export class ExecutionWebSocketServer {
  private wss: WebSocketServer;
  private httpServer: any;
  private clients = new Map<string, WSClient>();
  private redisSubscriber: any = null;
  private redisPublisher: any = null;
  private inMemorySubscriptions = new Map<string, Set<string>>();
  private userPollers = new Map<string, NodeJS.Timeout>();
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private circuitBreaker: RedisCircuitBreaker;
  private deltaDetector?: DeltaDetector;
  private config: {
    port: number;
    path: string;
    updateInterval: number;
    heartbeatInterval: number;
    heartbeatAdaptive: boolean;
    idleTimeout: number;
    redisEnabled: boolean;
    redisUrl: string;
    corsOrigins: string[];
    rateLimit: {
      messagesPerSecond: number;
      windowMs: number;
    };
  };

  constructor(
    config?: Partial<typeof ExecutionWebSocketServer.prototype.config>,
    dependencies?: WebSocketDependencies
  ) {
    this.config = {
      port: parseInt(process.env.WEBSOCKET_PORT || '9001'),
      path: process.env.WEBSOCKET_PATH || '/ws',
      updateInterval: parseInt(process.env.WEBSOCKET_UPDATE_INTERVAL || '10000'),
      heartbeatInterval: parseInt(process.env.WEBSOCKET_HEARTBEAT || '30000'),
      heartbeatAdaptive: process.env.WEBSOCKET_HEARTBEAT_ADAPTIVE === 'true',
      idleTimeout: parseInt(process.env.WEBSOCKET_IDLE_TIMEOUT || '300000'),
      redisEnabled: process.env.REDIS_ENABLED === 'true',
      redisUrl: process.env.REDIS_URL || 'redis://localhost',
      corsOrigins: this.parseCorsOrigins(process.env.WEBSOCKET_CORS_ORIGINS),
      rateLimit: {
        messagesPerSecond: parseInt(process.env.WEBSOCKET_RATE_LIMIT_MPS || '10'),
        windowMs: parseInt(process.env.WEBSOCKET_RATE_LIMIT_WINDOW || '1000'),
      },
      ...config,
    };
    this.deltaDetector = dependencies?.deltaDetector;

    // Initialize circuit breaker for Redis
    this.circuitBreaker = new RedisCircuitBreaker({
      failureThreshold: parseInt(process.env.REDIS_CB_FAILURE_THRESHOLD || '5'),
      successThreshold: parseInt(process.env.REDIS_CB_SUCCESS_THRESHOLD || '2'),
      timeout: parseInt(process.env.REDIS_CB_TIMEOUT || '30000'),
    });

    this.httpServer = createServer();
    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: this.config.path,
    });
  }

  private parseCorsOrigins(corsEnv?: string): string[] {
    if (!corsEnv) {
      // Default: allow localhost and same-origin
      return [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:3010',
        'http://127.0.0.1:3010',
      ];
    }
    return corsEnv.split(',').map(origin => origin.trim());
  }

  private validateCorsOrigin(origin: string | undefined): boolean {
    if (!origin) return true; // Allow no origin header (non-browser clients)
    return this.config.corsOrigins.some(allowed => {
      // Simple wildcard matching
      if (allowed === '*') return true;
      if (allowed.endsWith('*')) {
        const base = allowed.slice(0, -1);
        return origin.startsWith(base);
      }
      return origin === allowed;
    });
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
    this.maintenanceInterval = setInterval(
      () => this.checkIdleConnections(),
      this.config.idleTimeout / 2
    );

    // Start HTTP server and only resolve once the socket is actually ready.
    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error) => {
        this.httpServer.off('error', handleError);
        reject(error);
      };

      this.httpServer.once('error', handleError);
      this.httpServer.listen(this.config.port, () => {
        this.httpServer.off('error', handleError);
        logger.info(`[WebSocket] Server listening on port ${this.config.port}`);
        resolve();
      });
    });
  }

  private async handleConnection(ws: WebSocket, req: any): Promise<void> {
    try {
      // HIGH #2: Validate CORS origin before processing connection
      const origin = req.headers.origin;
      if (!this.validateCorsOrigin(origin)) {
        logger.warn(`[WebSocket] CORS origin rejected: ${origin}`);
        ws.close(1008, 'CORS policy violation');
        return;
      }

      // Authenticate user from JWT token
      const userId = await authenticateUser(req);
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      const channel = `execution-updates:${userId}`;
      const clientId = `${userId}-${Date.now()}-${Math.random()}`;

      // MEDIUM: Create client record with rate limiting and adaptive heartbeat tracking
      let messageCount = 0;
      let rateCheckTime = Date.now();

      const client: WSClient = {
        ws,
        userId,
        channel,
        // MEDIUM: Adaptive heartbeat - start with configured interval
        heartbeat: setInterval(() => {
          if (this.config.heartbeatAdaptive) {
            // Adaptive logic: increase interval if no recent activity
            const timeSinceLastActivity = Date.now() - client.lastActivity;
            const adaptiveInterval = timeSinceLastActivity > 30000
              ? this.config.heartbeatInterval * 2  // Double interval if idle >30s
              : this.config.heartbeatInterval;

            // Adjust heartbeat interval dynamically
            clearInterval(client.heartbeat);
            client.heartbeat = setInterval(() => ws.ping(), adaptiveInterval);
          } else {
            ws.ping();
          }
        }, this.config.heartbeatInterval),
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

      this.ensureUserPolling(userId);

      // Handle messages from client
      ws.on('message', (data: Buffer) => {
        client.lastActivity = Date.now();

        // MEDIUM: Rate limiting - check messages per second
        const now = Date.now();
        if (now - rateCheckTime > this.config.rateLimit.windowMs) {
          messageCount = 0;
          rateCheckTime = now;
        }

        messageCount++;
        if (messageCount > this.config.rateLimit.messagesPerSecond) {
          logger.warn(`[WebSocket] Rate limit exceeded for ${clientId}: ${messageCount} messages in ${this.config.rateLimit.windowMs}ms`);
          ws.close(1008, 'Rate limit exceeded');
          return;
        }

        try {
          // MEDIUM: Input validation - ensure message is valid JSON
          const message = JSON.parse(data.toString());
          if (!message.type) {
            logger.warn(`[WebSocket] Invalid message format from ${clientId}: missing type field`);
            return;
          }

          if (message.type === 'unsubscribe') {
            logger.debug(`[WebSocket] Client ${clientId} unsubscribed from ${message.channel || channel}`);
            return;
          }

          if (message.type === 'subscribe') {
            ws.send(JSON.stringify({
              type: 'subscribed',
              channel,
              timestamp: new Date().toISOString(),
            }));
            return;
          }

          logger.debug(`[WebSocket] Message from ${clientId}:`, message);
        } catch (error) {
          logger.warn(`[WebSocket] Invalid message format from ${clientId}:`, error);
          ws.close(1008, 'Invalid message format');
        }
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
    if (!this.clients.has(clientId)) {
      return;
    }

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

    this.teardownUserPolling(client.userId);
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

  private ensureUserPolling(userId: string): void {
    if (!this.deltaDetector || this.userPollers.has(userId)) {
      return;
    }

    // Prime current state so the first scheduled poll emits only true deltas.
    void this.deltaDetector.detectDeltas(userId).catch((error) => {
      logger.error(`[WebSocket] Failed to warm delta cache for ${userId}:`, error);
    });

    const poller = setInterval(async () => {
      await this.pollAndPublishDeltas(userId);
    }, this.config.updateInterval);

    this.userPollers.set(userId, poller);
  }

  private teardownUserPolling(userId: string): void {
    const hasRemainingClients = Array.from(this.clients.values()).some(
      (client) => client.userId === userId
    );

    if (hasRemainingClients) {
      return;
    }

    const poller = this.userPollers.get(userId);
    if (poller) {
      clearInterval(poller);
      this.userPollers.delete(userId);
    }
  }

  private async pollAndPublishDeltas(userId: string): Promise<void> {
    if (!this.deltaDetector) {
      return;
    }

    try {
      const deltas = await this.deltaDetector.detectDeltas(userId);

      for (const delta of deltas) {
        if (!this.deltaDetector.validateDeltaSize(delta)) {
          continue;
        }

        await this.publishDelta(userId, delta);
      }
    } catch (error) {
      logger.error(`[WebSocket] Failed to publish execution deltas for ${userId}:`, error);
    }
  }

  async publishDelta(userId: string, delta: any): Promise<void> {
    const channel = `execution-updates:${userId}`;
    const message = JSON.stringify({
      type: 'execution-update',
      data: delta,
      timestamp: new Date().toISOString(),
    });

    // HIGH #3: Circuit breaker pattern - check if Redis operation allowed
    if (this.config.redisEnabled && this.redisPublisher && this.circuitBreaker.canExecute()) {
      try {
        await this.redisPublisher.publish(channel, message);
        this.circuitBreaker.recordSuccess();
      } catch (error) {
        logger.error(`[WebSocket] Failed to publish via Redis: ${channel}`, error);
        this.circuitBreaker.recordFailure();

        // Fallback to in-memory broadcasting
        logger.info(`[WebSocket] Falling back to in-memory broadcast for ${channel}`);
        this.broadcastToUser(userId, message);
      }
    } else if (this.config.redisEnabled && !this.circuitBreaker.canExecute()) {
      // Circuit breaker is OPEN - skip Redis, use in-memory fallback
      logger.warn(`[WebSocket] Circuit breaker OPEN for Redis - using in-memory fallback for ${channel}`);
      this.broadcastToUser(userId, message);
    } else {
      // Redis disabled - use in-memory directly
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

    for (const poller of this.userPollers.values()) {
      clearInterval(poller);
    }
    this.userPollers.clear();

    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }

    // Cleanup Redis
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
    }
    if (this.redisPublisher) {
      await this.redisPublisher.quit();
    }

    await new Promise<void>((resolve, reject) => {
      this.wss.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    logger.info('[WebSocket] Server shut down complete');
  }

  // Metrics for monitoring
  getMetrics() {
    return {
      activeConnections: this.clients.size,
      channels: this.inMemorySubscriptions.size,
      activeUserPollers: this.userPollers.size,
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instance
let wsServer: ExecutionWebSocketServer | null = null;

export async function initializeWebSocketServer(
  config?: any,
  dependencies?: WebSocketDependencies
): Promise<ExecutionWebSocketServer> {
  if (!wsServer) {
    wsServer = new ExecutionWebSocketServer(config, dependencies);
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
