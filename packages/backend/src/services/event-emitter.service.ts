import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

interface EventPayload {
  [key: string]: any;
}

interface EmittedEvent {
  id: string;
  userId: string;
  eventType: string;
  eventId: string;
  eventVersion: number;
  payload: EventPayload;
  createdAt: string;
}

export class EventEmitterService {
  private emitter = new EventEmitter();
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  /**
   * Emit an event with deduplication and versioning
   * @param userId User ID
   * @param eventType Event type (format: "domain:action")
   * @param eventId UUID for deduplication
   * @param payload Event payload data
   * @param version Event version (default: 1)
   */
  async emitEvent(
    userId: string,
    eventType: string,
    eventId: string = uuidv4(),
    payload: EventPayload,
    version: number = 1
  ): Promise<EmittedEvent> {
    // Validate event type format
    if (!eventType.match(/^\w+:\w+$/)) {
      throw new Error('Invalid event type format. Use "domain:action"');
    }

    // Check for duplicates (idempotent)
    const { data: existing } = await this.supabase
      .from('event_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('event_type', eventType)
      .single();

    if (existing) {
      // Return existing event (idempotent)
      const { data } = await this.supabase
        .from('event_logs')
        .select('*')
        .eq('id', existing.id)
        .single();
      return this.mapToEmittedEvent(data);
    }

    // Insert new event
    const { data: newEvent, error } = await this.supabase
      .from('event_logs')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_id: eventId,
        event_version: version,
        payload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to emit event: ${error.message}`);
    }

    const emitted = this.mapToEmittedEvent(newEvent);

    // Broadcast to subscribers (async, non-blocking)
    this.emitter.emit(eventType, emitted);

    // Log for observability
    console.log(`[EVENT] ${eventType} emitted`, {
      userId,
      eventId,
      timestamp: new Date().toISOString(),
    });

    return emitted;
  }

  /**
   * Subscribe to event type
   */
  onEvent(eventType: string, handler: (event: EmittedEvent) => void): void {
    this.emitter.on(eventType, handler);
  }

  /**
   * Unsubscribe from event type
   */
  offEvent(eventType: string, handler: (event: EmittedEvent) => void): void {
    this.emitter.off(eventType, handler);
  }

  /**
   * Broadcast event to WebSocket subscribers
   */
  broadcastToWebSocket(eventType: string, event: EmittedEvent): void {
    // This will be called by WebSocket handler to broadcast to connected clients
    this.emitter.emit(`ws:${eventType}`, event);
  }

  private mapToEmittedEvent(data: any): EmittedEvent {
    return {
      id: data.id,
      userId: data.user_id,
      eventType: data.event_type,
      eventId: data.event_id,
      eventVersion: data.event_version,
      payload: data.payload,
      createdAt: data.created_at,
    };
  }
}

export const eventEmitterService = new EventEmitterService();
