# Rule-Based Automation Engine Guide

## Overview

The Rule-Based Automation Engine is the core system that enables users to create automated workflows triggered by events. It provides:

- **Event-driven triggers** - Rules activate when specific events occur (task created, status changed, etc.)
- **Flexible condition evaluation** - Support for complex boolean logic using AND/OR operators
- **Atomic action execution** - All-or-nothing semantics with automatic rollback on failure
- **Loop detection** - Prevents infinite cascading rule executions
- **Rate limiting** - Enforces quotas to prevent abuse
- **Complete audit trail** - Full history of rule changes and executions

---

## Architecture Overview

### 5 Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Rule Engine Service                      │
│              (Main orchestrator: ruleEngineService)          │
└──────────────┬──────────────────────────────────────────────┘
               │
      ┌────────┼────────┬─────────────┬──────────────┐
      ▼        ▼        ▼             ▼              ▼
   ┌──────────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐
   │ Evaluation   │ │ Execution    │ │ Loop       │ │ Rate       │
   │ Service      │ │ Service      │ │ Detector   │ │ Limiter    │
   └──────────────┘ └──────────────┘ └────────────┘ └────────────┘
   • Condition     • Action dispatch • Loop check  • User quota
   • Operators     • Atomicity       • Depth limit • Daily reset
   • JSON paths    • Rollback        • Chain build • Exec count
```

### 1. RuleEngineService (Orchestrator)

**File:** `packages/backend/src/services/rule-engine.service.ts`

**Responsibilities:**
- Main entry point for rule execution
- Coordinates all other services
- Manages rule CRUD operations
- Maintains audit trail

**Key Methods:**

```typescript
executeRule(ruleId, event, context, executionChain)
  → Orchestrates: loop detection → rate limiting → condition evaluation → action execution
  → Returns: { success: boolean, error?: string, duration: number }

createRule(userId, ruleName, config)
  → Creates new rule, logs to rule_history
  → Returns: ruleId

updateRule(ruleId, userId, config, changeReason?)
  → Updates config, records old/new in rule_history
  → Returns: void

deleteRule(ruleId, userId, deleteReason?)
  → Soft delete with deleted_at timestamp
  → Logs to rule_history
  → Returns: void
```

### 2. RuleEvaluationService

**File:** `packages/backend/src/services/rule-evaluation.service.ts`

**Responsibilities:**
- Evaluate conditions against context data
- Support 7 comparison operators
- Handle nested field access via JSON paths
- Support AND/OR boolean logic

**Supported Operators:**

| Operator | Example | Notes |
|----------|---------|-------|
| `equals` | `priority = "high"` | Strict equality |
| `not_equals` | `status != "archived"` | Inverse of equals |
| `greater_than` | `count > 100` | Numeric comparison |
| `less_than` | `days_open < 30` | Numeric comparison |
| `in` | `status in ["active", "pending"]` | Array membership |
| `not_in` | `type not in ["spam", "test"]` | Array non-membership |
| `contains` | `title contains "urgent"` | String search (case-sensitive) |

**JSON Path Support:**

```typescript
// Access nested fields with dot notation
{
  field: "task.priority",
  operator: "equals",
  value: "high"
}

// Evaluates against: { task: { priority: "high", status: "open" } }
```

**Boolean Logic:**

```typescript
// AND: All conditions must be true
evaluateConditions(conditions, context, 'AND')

// OR: At least one condition must be true
evaluateConditions(conditions, context, 'OR')
```

### 3. RuleExecutionService

**File:** `packages/backend/src/services/rule-execution.service.ts`

**Responsibilities:**
- Execute action payloads
- Ensure atomic transaction semantics (all-or-nothing)
- Handle different action types
- Provide detailed error reporting

**Supported Action Types:**

#### update_task
Updates one or more fields on an existing task.

```json
{
  "type": "update_task",
  "params": {
    "taskId": "task-123",
    "fields": {
      "status": "in_progress",
      "assignee": "user-456",
      "priority": "high"
    }
  }
}
```

#### create_task
Creates a new task with provided details.

```json
{
  "type": "create_task",
  "params": {
    "title": "Follow up on review feedback",
    "description": "Incorporates feedback from task #789",
    "priority": "medium",
    "project_id": "proj-123"
  }
}
```

#### send_webhook
Queues a reliable webhook delivery and only releases the HTTP dispatch after the
rest of the atomic action batch succeeds.

```json
{
  "type": "send_webhook",
  "params": {
    "webhookUrl": "https://api.example.com/automation/notify",
    "payload": {
      "event": "task_created",
      "task_id": "task-123",
      "timestamp": "2025-03-02T10:30:00Z"
    }
  }
}
```

Alternatively, use a stored webhook ID:
```json
{
  "type": "send_webhook",
  "params": {
    "webhookId": "webhook-456",
    "payload": { ... }
  }
}
```

For atomic execution, prefer a registered `webhookId`. If `webhookUrl` is used,
the URL must already exist in the `webhooks` registry so the delivery can be
queued and retried safely.

#### send_notification
Creates an in-app notification for a user.

```json
{
  "type": "send_notification",
  "params": {
    "userId": "user-123",
    "message": "Your high-priority task was assigned",
    "priority": "high"
  }
}
```

Priorities: `low`, `normal` (default), `high`

#### assign_tag
Adds a tag to a task (creates tag if needed).

```json
{
  "type": "assign_tag",
  "params": {
    "taskId": "task-123",
    "tagName": "urgent"
  }
}
```

**Atomic Execution:**

```
BEGIN TRANSACTION
  FOR each action:
    execute action
    IF error:
      ROLLBACK
      throw error
  COMMIT
```

All actions succeed or all rollback. No partial execution.

`send_webhook` is treated as a deferred side effect:

```
1. Queue webhook delivery record
2. Continue executing local actions
3. If any later action fails: delete queued delivery during rollback
4. If batch succeeds: dispatch queued delivery after commit
```

This avoids firing an external HTTP request in the middle of an atomic rule run.

### 4. LoopDetectorService

**File:** `packages/backend/src/services/loop-detector.service.ts`

**Responsibilities:**
- Prevent infinite rule cascades
- Enforce maximum execution depth
- Detect direct and indirect loops

**Mechanism:**

```
Execution Chain: [rule-1, rule-2, rule-3]
    ↓
Check if rule-4 is already in chain → NO
Check if chain.length < MAX_DEPTH (3) → YES
    ↓
Allow execution, build new chain: [rule-1, rule-2, rule-3, rule-4]
```

**Loop Detection Examples:**

✅ Allowed:
```
task:created → rule-1 (no loop)
task:created → rule-1 → rule-2 (depth: 2)
task:created → rule-1 → rule-2 → rule-3 (depth: 3, max)
```

❌ Blocked:
```
task:created → rule-1 → rule-1 (self-trigger, depth error)
task:updated → rule-1 → (update task) → task:updated → rule-1 (indirect loop)
rule-1 → rule-2 → rule-3 → rule-4 (depth > 3)
```

**Configuration:**
- `MAX_DEPTH = 3` - Maximum nesting levels

### 5. RateLimiterService

**File:** `packages/backend/src/services/rate-limiter.service.ts`

**Responsibilities:**
- Enforce per-user rule creation quotas
- Track daily execution counts
- Reset counts at UTC midnight
- Provide current usage metrics

**Rate Limits:**

| Limit | Value | Notes |
|-------|-------|-------|
| Rules per user | 100 | Soft limit via canCreateRule() check |
| Executions per rule/day | 1000 | Hard limit, resets at UTC midnight |

**Daily Reset Logic:**

```typescript
// At 00:00:00 UTC, background job resets all rules:
execution_count = 0

// Manual query to get current count:
if (lastExecutionAt < todayUTC00:00):
  return 0  // Already reset
else:
  return current_count
```

**Configuration:**
- `MAX_RULES_PER_USER = 100`
- `MAX_EXECUTIONS_PER_DAY = 1000`
- Reset schedule: Daily (UTC midnight)

---

## Rule Configuration Schema

### Complete Example

```json
{
  "trigger": {
    "event_type": "task:created",
    "filters": [
      {
        "field": "priority",
        "operator": "equals",
        "value": "high"
      }
    ]
  },
  "conditions": [
    {
      "field": "assigned_to",
      "operator": "not_equals",
      "value": null
    },
    {
      "field": "project.status",
      "operator": "in",
      "value": ["active", "archived"]
    }
  ],
  "actions": [
    {
      "type": "send_notification",
      "params": {
        "message": "High-priority task assigned to you",
        "priority": "high"
      }
    },
    {
      "type": "assign_tag",
      "params": {
        "tag_name": "urgent"
      }
    }
  ],
  "maxDepth": 3,
  "conditionLogic": "AND"
}
```

### Schema Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trigger.event_type` | string | ✓ | Event that activates rule (e.g., "task:created") |
| `trigger.filters` | array | ✗ | Pre-execution filters (same as conditions) |
| `conditions` | array | ✓ | Boolean conditions that must match |
| `actions` | array | ✓ | Actions to execute when rule fires |
| `maxDepth` | number | ✗ | Override global max depth (default: 3) |
| `conditionLogic` | string | ✗ | "AND" or "OR" (default: "AND") |

---

## Usage Examples

### Example 1: High-Priority Task Workflow

Automatically tag and notify when high-priority tasks are assigned.

```javascript
const config = {
  trigger: {
    event_type: "task:created"
  },
  conditions: [
    {
      field: "priority",
      operator: "equals",
      value: "high"
    },
    {
      field: "assigned_to",
      operator: "not_equals",
      value: null
    }
  ],
  actions: [
    {
      type: "assign_tag",
      params: { tag_name: "urgent" }
    },
    {
      type: "send_notification",
      params: {
        message: "You have a high-priority assignment",
        priority: "high"
      }
    }
  ],
  conditionLogic: "AND"
};

const ruleId = await ruleEngineService.createRule(
  "user-123",
  "High Priority Alerts",
  config
);
```

### Example 2: Stale Task Cleanup

Automatically close tasks that haven't been updated in 30 days.

```javascript
const config = {
  trigger: {
    event_type: "daily:check"  // Custom event
  },
  conditions: [
    {
      field: "status",
      operator: "not_equals",
      value: "closed"
    },
    {
      field: "last_update_days",
      operator: "greater_than",
      value: 30
    }
  ],
  actions: [
    {
      type: "update_task",
      params: {
        taskId: "dynamic",  // Will be replaced with context
        fields: {
          status: "closed",
          close_reason: "auto_stale"
        }
      }
    }
  ]
};

const ruleId = await ruleEngineService.createRule(
  "user-123",
  "Stale Task Cleanup",
  config
);
```

### Example 3: Cross-System Integration

Send task updates to external system via webhook.

```javascript
const config = {
  trigger: {
    event_type: "task:updated"
  },
  conditions: [
    {
      field: "project.integration",
      operator: "equals",
      value: "slack"
    }
  ],
  actions: [
    {
      type: "send_webhook",
      params: {
        webhookId: "slack-webhook-123",
        payload: {
          event: "task_updated",
          task_id: "${event.taskId}",
          new_status: "${event.status}",
          updated_by: "${event.updated_by}"
        }
      }
    }
  ]
};

const ruleId = await ruleEngineService.createRule(
  "user-123",
  "Slack Integration",
  config
);
```

---

## Execution Flow

### Step-by-Step Execution Process

```
1. Event Triggered (e.g., task:created)
   ↓
2. Rule Engine fetches rule from database
   ↓
3. Loop Detection
   - Check if rule already in execution chain
   - Check if depth < 3
   → BLOCKED: Throw error
   → OK: Continue
   ↓
4. Rate Limiting
   - Check if rule executions < 1000 today
   → EXCEEDED: Throw error
   → OK: Continue
   ↓
5. Trigger Filters (if present)
   - Evaluate against event
   → NO MATCH: Return success=false
   → MATCH: Continue
   ↓
6. Condition Evaluation
   - Evaluate all conditions with AND/OR logic
   → CONDITIONS NOT MET: Return success=false
   → CONDITIONS MET: Continue
   ↓
7. Execute Actions (Atomic)
   - BEGIN TRANSACTION
   - Execute action 1
   - IF error: ROLLBACK, return error
   - Execute action 2
   - ...
   - IF all success: COMMIT
   ↓
8. Update Counters
   - Increment execution_count
   - Update last_execution_at
   ↓
9. Audit Logging
   - Insert automation_logs entry with status, duration, errors
   - Finalize rule_history entry if rule was modified
   ↓
10. Return Result
    { success: boolean, error?: string, duration: number }
```

---

## Database Schema

### rules table

```sql
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rule_name VARCHAR(255) NOT NULL,
  rule_version INT DEFAULT 1,
  config JSONB NOT NULL,  -- RuleConfig JSON
  enabled BOOLEAN DEFAULT true,
  execution_count INT DEFAULT 0,
  last_execution_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,  -- Soft delete
  UNIQUE(user_id, rule_name)
);
```

### rule_history table (Audit Trail)

```sql
CREATE TABLE rule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES rules(id),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_type VARCHAR(50) NOT NULL,  -- 'created', 'updated', 'deleted', 'enabled', 'disabled'
  old_config JSONB,
  new_config JSONB,
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### automation_logs table (Execution Logs)

```sql
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES rules(id),
  execution_status VARCHAR(50) NOT NULL,  -- 'success' or 'failed'
  duration_ms INT NOT NULL,
  error_message TEXT,
  execution_chain_depth INT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Monitoring & Debugging

### Query Current Execution Count

```sql
SELECT
  id,
  rule_name,
  execution_count,
  last_execution_at,
  CASE
    WHEN last_execution_at::date = CURRENT_DATE THEN execution_count
    ELSE 0
  END as daily_count
FROM rules
WHERE user_id = 'user-123'
ORDER BY execution_count DESC;
```

### View Rule Change History

```sql
SELECT
  rule_id,
  changed_by,
  change_type,
  change_reason,
  created_at
FROM rule_history
WHERE rule_id = 'rule-123'
ORDER BY created_at DESC;
```

### Find Execution Bottlenecks

```sql
SELECT
  rule_id,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) as executions
FROM automation_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY rule_id
ORDER BY avg_duration DESC;
```

### Identify Failed Rules

```sql
SELECT
  rule_id,
  error_message,
  COUNT(*) as failure_count,
  MAX(created_at) as last_failure
FROM automation_logs
WHERE execution_status = 'failed'
  AND created_at > now() - interval '24 hours'
GROUP BY rule_id, error_message
ORDER BY failure_count DESC;
```

---

## Performance Characteristics

### Evaluation Speed

| Scenario | Expected Duration | Notes |
|----------|-------------------|-------|
| Simple rule (1 condition) | <5ms | Single field comparison |
| Medium rule (5 conditions) | <50ms | Multiple conditions with AND/OR |
| Complex rule (10+ conditions) | <100ms | Nested field access, multiple operators |

**Optimizations:**
- Short-circuit evaluation for AND (stops on first false)
- Pre-compiled condition operators
- Indexed database queries for rule lookups

### Concurrency

- Supports 100+ concurrent rule executions
- No lock contention for independent rules
- Database connection pooling recommended

### Storage

- Average rule config: ~500 bytes
- Average history entry: ~800 bytes
- Typical user with 50 rules: ~100KB data

---

## Best Practices

### Rule Design

✅ **DO:**
- Use specific trigger events
- Minimize conditions (5 or fewer recommended)
- Group related actions in single rule
- Use meaningful rule names
- Document rule purpose in change_reason

❌ **DON'T:**
- Create self-referencing rules
- Chain rules unnecessarily (depth > 2)
- Use broad conditions that match everything
- Ignore rate limits
- Skip error handling in webhooks

### Performance

✅ **DO:**
- Monitor execution times via automation_logs
- Index frequently-queried fields
- Batch related actions
- Use connection pooling

❌ **DON'T:**
- Execute heavy computations in rules
- Create rules for high-frequency events without filtering
- Chain 10+ levels deep
- Ignore execution count limits

### Security

✅ **DO:**
- Validate webhook URLs
- Use HTTPS for webhook endpoints
- Encrypt sensitive data in webhook payloads
- Audit rule changes regularly
- Enforce rate limits

❌ **DON'T:**
- Store credentials in rule configs
- Trust user input without validation
- Expose rule internals in error messages
- Allow unlimited rule creation

---

## Troubleshooting

### Rule Not Executing

**Check:**
1. Rule enabled? → `SELECT enabled FROM rules WHERE id = 'rule-123'`
2. Conditions matching? → Review condition logic
3. Rate limit exceeded? → Check execution_count vs 1000/day
4. Loop detection? → Review execution_chain_depth in logs

### Slow Rule Execution

**Check:**
1. Number of conditions → Reduce if > 5
2. Webhook timeout → Increase timeout, check endpoint
3. Database queries → Add indexes on frequently-queried fields
4. Concurrent executions → Monitor database connections

### Actions Not Executing

**Check:**
1. Action params valid? → Review error_message in automation_logs
2. Database constraints? → Check foreign keys exist
3. Permission issues? → Verify user_id and data access
4. Transaction rollback? → Check for partial failures

---

## Future Enhancements

- [ ] Scheduled triggers (cron-based rules)
- [ ] Custom action types via plugins
- [ ] Conditional branching (if/else in actions)
- [ ] Variable substitution in payloads
- [ ] Rule templates for common workflows
- [ ] Performance metrics dashboard
- [ ] Rule testing/simulation mode
