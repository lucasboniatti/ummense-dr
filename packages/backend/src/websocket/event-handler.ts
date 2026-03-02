import { Server as SocketIOServer, Socket } from 'socket.io';
import { eventEmitterService } from '../services/event-emitter.service';

interface ClientSubscription {
  eventType: string;
  handler: (event: any) => void;
}

/**
 * WebSocket Event Handler
 * Manages real-time event subscriptions and broadcasts
 */
export class WebSocketEventHandler {
  private io: SocketIOServer;
  private clientSubscriptions = new Map<string, ClientSubscription[]>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupConnectionHandlers();
  }

  /**
   * Setup socket.io connection handlers
   */
  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[WEBSOCKET] Client connected: ${socket.id}`);

      // Start heartbeat
      this.startHeartbeat(socket.id);

      // Handle subscriptions
      socket.on('subscribe', (eventType: string) => {
        this.subscribe(socket, eventType);
      });

      socket.on('unsubscribe', (eventType: string) => {
        this.unsubscribe(socket, eventType);
      });

      // Cleanup on disconnect
      socket.on('disconnect', () => {
        this.cleanup(socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`[WEBSOCKET] Socket error: ${socket.id}`, error);
        this.cleanup(socket.id);
      });
    });
  }

  /**
   * Subscribe to event type
   */
  private subscribe(socket: Socket, eventType: string): void {
    if (!eventType.match(/^\w+:\w+$/)) {
      socket.emit('error', 'Invalid event type format');
      return;
    }

    const handler = (event: any) => {
      socket.emit(eventType, event);
    };

    // Store subscription for cleanup
    if (!this.clientSubscriptions.has(socket.id)) {
      this.clientSubscriptions.set(socket.id, []);
    }
    this.clientSubscriptions.get(socket.id)!.push({ eventType, handler });

    // Subscribe to events
    eventEmitterService.onEvent(eventType, handler);
    socket.emit('subscribed', { eventType });

    console.log(`[WEBSOCKET] ${socket.id} subscribed to ${eventType}`);
  }

  /**
   * Unsubscribe from event type
   */
  private unsubscribe(socket: Socket, eventType: string): void {
    const subscriptions = this.clientSubscriptions.get(socket.id);
    if (!subscriptions) return;

    const index = subscriptions.findIndex((sub) => sub.eventType === eventType);
    if (index > -1) {
      const subscription = subscriptions[index];
      eventEmitterService.offEvent(eventType, subscription.handler);
      subscriptions.splice(index, 1);
      console.log(`[WEBSOCKET] ${socket.id} unsubscribed from ${eventType}`);
    }
  }

  /**
   * Start heartbeat (30-second interval)
   * Keeps connection alive and detects stale clients
   */
  private startHeartbeat(socketId: string): void {
    const interval = setInterval(() => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // 30 seconds

    this.heartbeatIntervals.set(socketId, interval);
  }

  /**
   * Cleanup on disconnect
   * - Cancel heartbeat
   * - Unsubscribe from all events
   */
  private cleanup(socketId: string): void {
    // Cancel heartbeat
    const interval = this.heartbeatIntervals.get(socketId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(socketId);
    }

    // Unsubscribe from all events
    const subscriptions = this.clientSubscriptions.get(socketId);
    if (subscriptions) {
      subscriptions.forEach(({ eventType, handler }) => {
        eventEmitterService.offEvent(eventType, handler);
      });
      this.clientSubscriptions.delete(socketId);
    }

    console.log(`[WEBSOCKET] Client cleanup: ${socketId}`);
  }

  /**
   * Broadcast event to all subscribed clients
   */
  broadcastEvent(eventType: string, event: any): void {
    this.io.emit(eventType, event);
  }
}
