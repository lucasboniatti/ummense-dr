# Event System Guide (Story 2.1)

## Overview

The Event System is the foundation of Wave 2 real-time automation features. It provides:

- **UUID-based Deduplication:** Prevents duplicate event processing using unique event IDs
- **Event Versioning:** Supports schema evolution for events over time
- **Real-time Broadcasting:** WebSocket integration for instant notifications
- **Event Audit Trail:** 90-day retention with soft deletes for compliance
- **At-Least-Once Semantics:** Idempotent event processing ensures reliability

## Architecture

### Core Components

#### 1. EventEmitterService (`src/services/event-emitter.service.ts`)

Handles event emission with deduplication and versioning.

```typescript
const emitter = new EventEmitterService();

// Emit event
const event = await emitter.emitEvent(
  userId: string,
  eventType: string,      // Format: "domain:action"
  eventId?: string,       // UUID, auto-generated if not provided
  payload: object,        // Event data
  version?: number        // Schema version (default: 1)
);
```

**Event Type Format:** Must be `domain:action` (e.g., `task:created`, `automation:executed`)

**Idempotency:** Calling `emitEvent` with the same `(userId, eventType, eventId)` returns the existing event instead of creating a duplicate.

**Database Table:** `event_logs`
```sql
CREATE TABLE event_logs (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id UUID NOT NULL,
  event_version INT DEFAULT 1,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  UNIQUE(user_id, event_id, event_type)
);
```

#### 2. EventDeduplicationService (`src/services/event-deduplication.service.ts`)

Manages deduplication checks at the database level.

```typescript
const dedup = new EventDeduplicationService();

// Check if event already exists
const isDuplicate = await dedup.isEventDuplicate(
  userId: string,
  eventId: string,
  eventType: string
);

// Get existing event
const event = await dedup.getExistingEvent(
  userId: string,
  eventId: string,
  eventType: string
);
```

**Constraint Enforcement:** The database enforces `UNIQUE(user_id, event_id, event_type)`, making deduplication atomic and reliable.

#### 3. WebSocketEventHandler (`src/websocket/event-handler.ts`)

Manages real-time subscriptions and broadcasts over Socket.io.

```typescript
const handler = new WebSocketEventHandler(io);

// Automatically called on socket connection:
// - Starts 30-second heartbeat
// - Listens for subscribe/unsubscribe events
// - Handles cleanup on disconnect

// Manual event broadcast
handler.broadcastEvent(eventType: string, event: any);
```

**Heartbeat Mechanism:** Every 30 seconds, the server sends a heartbeat to each connected client. Clients must acknowledge within 5 minutes (10 missed heartbeats) or the connection is terminated.

#### 4. EventCleanupJob (`src/jobs/event-cleanup.job.ts`)

Scheduled job that soft-deletes events older than 90 days.

```typescript
const cleanup = new EventCleanupJob();
cleanup.start(24); // Run every 24 hours
cleanup.stop();
```

**Soft Delete:** Uses `deleted_at` timestamp instead of hard delete for audit trail.

#### 5. WebSocketHeartbeatTimeoutJob (`src/jobs/websocket-heartbeat.job.ts`)

Monitors heartbeat responses and disconnects stale clients.

```typescript
const timeout = new WebSocketHeartbeatTimeoutJob(io);
timeout.start(); // Checks every 60 seconds
timeout.stop();
```

**Stale Detection:** After 10 missed heartbeats (5+ minutes), the socket is forcefully disconnected.

## Usage Examples

### 1. Emitting an Event

```typescript
import { eventEmitterService } from '@/services/event-emitter.service';

// Emit task creation event
const event = await eventEmitterService.emitEvent(
  userId: 'user-123',
  eventType: 'task:created',
  eventId: uuidv4(),
  payload: {
    taskId: 'task-456',
    title: 'Implement feature',
    priority: 'high',
    createdAt: new Date().toISOString()
  },
  version: 1
);

console.log(event.id); // UUID of stored event
```

### 2. Subscribing to Events (WebSocket)

**Client-side (JavaScript):**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  // Subscribe to automation:executed events
  socket.emit('subscribe', 'automation:executed');
});

// Receive events in real-time
socket.on('automation:executed', (event) => {
  console.log('Automation executed:', event.payload);
  // Update UI, trigger notifications, etc.
});

// Acknowledge heartbeat
socket.on('heartbeat', (data) => {
  socket.emit('heartbeat_ack', { timestamp: data.timestamp });
});

// Cleanup on disconnect
socket.on('disconnect', () => {
  console.log('Connection lost');
});
```

**Server-side (TypeScript):**
```typescript
import { WebSocketEventHandler } from '@/websocket/event-handler';

const handler = new WebSocketEventHandler(io);

// Events are automatically handled:
// - subscribe: Registers client subscription
// - unsubscribe: Removes subscription
// - disconnect: Cleans up resources
// - heartbeat_ack: Prevents timeout

// To broadcast events after emission
handler.broadcastEvent('task:created', {
  id: 'event-uuid',
  userId: 'user-123',
  eventType: 'task:created',
  payload: { taskId: 'task-456' }
});
```

### 3. Handling Duplicate Events

Events are idempotent by design:

```typescript
// First call: Inserts event
const event1 = await eventEmitterService.emitEvent(
  'user-123',
  'task:created',
  'event-uuid-456',
  { taskId: 'task-1' }
);

// Second call: Returns existing event (same ID)
const event2 = await eventEmitterService.emitEvent(
  'user-123',
  'task:created',
  'event-uuid-456', // Same event ID
  { taskId: 'task-1' }
);

console.log(event1.id === event2.id); // true
```

### 4. Event Versioning for Schema Evolution

```typescript
// Version 1: Original schema
const eventV1 = await eventEmitterService.emitEvent(
  'user-123',
  'task:created',
  uuidv4(),
  { taskId: 'task-1', title: 'Task' },
  version: 1
);

// Version 2: Schema with new fields
const eventV2 = await eventEmitterService.emitEvent(
  'user-123',
  'task:created',
  uuidv4(),
  { taskId: 'task-2', title: 'Task', priority: 'high' },
  version: 2
);

// Subscribe to specific versions
eventEmitterService.onEvent('task:created', (event) => {
  if (event.eventVersion === 1) {
    // Handle v1 schema
  } else if (event.eventVersion === 2) {
    // Handle v2 schema
  }
});
```

## Event Types

Standard event types follow `domain:action` format:

| Domain | Action | Description |
|--------|--------|-------------|
| task | created | Task created |
| task | updated | Task modified |
| task | completed | Task marked complete |
| automation | executed | Automation/rule executed |
| rule | triggered | Rule condition met |
| rule | completed | Rule execution finished |
| webhook | delivered | Webhook sent |
| webhook | failed | Webhook delivery failed |

## Reliability Guarantees

### At-Least-Once Semantics

Events are guaranteed to be processed at least once due to idempotency:

1. Client emits event with UUID
2. Server checks for duplicates before inserting
3. If duplicate found, returns existing event
4. If new, inserts and broadcasts
5. Broadcasting is async (non-blocking)

### Ordering Guarantees

Events from the same user maintain order via `created_at` timestamp in the database. WebSocket delivery order may vary, but the source of truth is the database.

### Durability

All events are persisted to Supabase PostgreSQL before broadcasting. Failures during broadcast do not affect durability.

## Monitoring & Debugging

### Check Event Stream

```sql
-- View recent events
SELECT id, user_id, event_type, created_at, payload
FROM event_logs
WHERE user_id = 'user-123'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- Check for duplicates
SELECT user_id, event_id, event_type, COUNT(*) as count
FROM event_logs
WHERE deleted_at IS NULL
GROUP BY user_id, event_id, event_type
HAVING COUNT(*) > 1;

-- View soft-deleted events
SELECT id, user_id, event_type, created_at, deleted_at
FROM event_logs
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

### Monitor WebSocket Connections

```typescript
// Get active connections
const clients = io.engine.clients.size;
console.log(`Active WebSocket clients: ${clients}`);

// Monitor heartbeat timeouts
console.log('[HEARTBEAT TIMEOUT] Disconnecting stale connections:', {
  count: staleSockets.length,
  socketIds: staleSockets
});
```

### Observability Logging

Events are logged at emission:
```
[EVENT] task:created emitted {
  userId: 'user-123',
  eventId: 'uuid-456',
  timestamp: '2025-03-02T10:30:45.123Z'
}
```

WebSocket activity is logged at subscription:
```
[WEBSOCKET] socket-id subscribed to automation:executed
[WEBSOCKET] socket-id unsubscribed from task:created
[WEBSOCKET] Client cleanup: socket-id
```

Cleanup job logs execution:
```
[EVENT CLEANUP] Successfully cleaned up events {
  timestamp: '2025-03-02T10:31:00.000Z',
  cutoffDate: '2024-12-02T10:31:00.000Z',
  affectedRows: 45
}
```

Heartbeat timeout logs disconnections:
```
[HEARTBEAT TIMEOUT] Disconnecting 3 stale connection(s) {
  timestamp: '2025-03-02T10:32:15.000Z',
  socketIds: ['socket-1', 'socket-2', 'socket-3']
}
```

## Configuration

### Heartbeat Interval

Default: 30 seconds (defined in `event-handler.ts`)

```typescript
const interval = setInterval(() => {
  socket.emit('heartbeat', { timestamp: Date.now() });
}, 30000); // 30 seconds
```

### Stale Connection Timeout

Default: 5 minutes (10 missed heartbeats × 30 seconds)

```typescript
private readonly MAX_MISSED_HEARTBEATS = 10; // 5 minutes
```

### Event Retention

Default: 90 days before soft-delete

```typescript
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
```

### Cleanup Job Interval

Default: 24 hours

```typescript
eventCleanupJob.start(24); // 24-hour interval
```

## Testing

Comprehensive test suite in `tests/event-system.test.ts`:

- **Unit Tests:** Deduplication, event type validation, versioning
- **Integration Tests:** Event flow, WebSocket handling, constraint enforcement
- **E2E Tests:** Full event lifecycle, concurrent event handling, event ordering

Run tests:
```bash
npm test -- event-system.test.ts
```

## Future Enhancements

- Event filters for WebSocket subscriptions (e.g., `task:created AND priority=high`)
- Event replay for new subscribers
- Event aggregation for high-throughput scenarios
- Dead letter queue for failed deliveries
- Event stream snapshots for large backlogs
