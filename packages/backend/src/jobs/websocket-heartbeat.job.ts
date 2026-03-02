import { Server as SocketIOServer } from 'socket.io';

/**
 * WebSocket Heartbeat Timeout Job
 * Monitors heartbeat responses and detects stale connections
 * Forcefully disconnects sockets that miss 10+ heartbeats (5+ minutes at 30s intervals)
 */
export class WebSocketHeartbeatTimeoutJob {
  private io: SocketIOServer;
  private heartbeatTimeouts = new Map<string, { missedCount: number; lastSeen: Date }>();
  private intervalId?: NodeJS.Timeout;
  private readonly MAX_MISSED_HEARTBEATS = 10; // 10 * 30s = 5 minutes
  private readonly CHECK_INTERVAL_MS = 60000; // Check every 60 seconds

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupHeartbeatTracking();
  }

  /**
   * Setup heartbeat tracking on connections
   */
  private setupHeartbeatTracking(): void {
    this.io.on('connection', (socket) => {
      // Initialize heartbeat tracker for this socket
      this.heartbeatTimeouts.set(socket.id, {
        missedCount: 0,
        lastSeen: new Date()
      });

      // Client acknowledges heartbeat
      socket.on('heartbeat_ack', () => {
        const tracker = this.heartbeatTimeouts.get(socket.id);
        if (tracker) {
          tracker.missedCount = 0; // Reset missed count on ack
          tracker.lastSeen = new Date();
        }
      });

      // Cleanup on disconnect
      socket.on('disconnect', () => {
        this.heartbeatTimeouts.delete(socket.id);
      });
    });
  }

  /**
   * Start heartbeat timeout monitoring job
   */
  start(): void {
    console.log('[HEARTBEAT TIMEOUT] Starting job - checks every 60 seconds');

    this.intervalId = setInterval(() => {
      this.checkHeartbeats();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop heartbeat monitoring job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('[HEARTBEAT TIMEOUT] Job stopped');
    }
  }

  /**
   * Check all active connections for heartbeat timeouts
   */
  private checkHeartbeats(): void {
    const now = new Date();
    const disconnectQueue: string[] = [];

    for (const [socketId, tracker] of this.heartbeatTimeouts.entries()) {
      const socket = this.io.sockets.sockets.get(socketId);

      if (!socket) {
        // Socket no longer exists
        this.heartbeatTimeouts.delete(socketId);
        continue;
      }

      // Increment missed count (heartbeat is sent every 30s, check every 60s = 2 heartbeats)
      tracker.missedCount += 2;

      if (tracker.missedCount >= this.MAX_MISSED_HEARTBEATS) {
        disconnectQueue.push(socketId);
      }
    }

    // Disconnect stale sockets
    if (disconnectQueue.length > 0) {
      console.log(
        `[HEARTBEAT TIMEOUT] Disconnecting ${disconnectQueue.length} stale connection(s)`,
        {
          timestamp: now.toISOString(),
          socketIds: disconnectQueue
        }
      );

      disconnectQueue.forEach((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
          this.heartbeatTimeouts.delete(socketId);
        }
      });
    }
  }
}

/**
 * Factory function to create and start the job
 */
export function createHeartbeatTimeoutJob(io: SocketIOServer): WebSocketHeartbeatTimeoutJob {
  const job = new WebSocketHeartbeatTimeoutJob(io);
  job.start();
  return job;
}
