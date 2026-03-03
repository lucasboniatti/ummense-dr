# Execution Engine Architecture Guide

**Story:** 3.1 - Workflow Execution Engine Refactor
**Version:** 1.0
**Date:** 2026-03-02
**Status:** Ready for Review

---

## Overview

The Execution Engine is the foundation of Wave 3 automation capabilities. It refactors the single-step automation model (Wave 2) into a flexible multi-step workflow engine while maintaining 100% backwards compatibility.

### Key Characteristics

- **Sequential Execution:** Steps execute in strict order (no parallelization)
- **Context Passing:** Each step has access to previous outputs
- **Error Handling:** Detailed error capture with full context
- **Backwards Compatible:** Wave 2 automations work unchanged
- **Observable:** All executions tracked in database

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Unchanged)                     │
│  POST /api/automations, GET /api/automations/{id}            │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   ┌──────────┐          ┌──────────────────┐
   │ Wave 2   │          │ Wave 3 Native    │
   │ Automation   ──────▶ │ Multi-Step       │
   └──────────┘          │ Automation       │
        │                │ (WorkflowConfig) │
        └────────┬───────┴──────────────────┘
                 │
        ┌────────▼─────────────────────┐
        │  ExecutionService            │
        │ - executeWorkflow()          │
        │ - executeStep()              │
        │ - registerStepHandler()      │
        │ - buildContext()             │
        └────────┬─────────────────────┘
                 │
      ┌──────────┼──────────────┐
      │          │              │
      ▼          ▼              ▼
   ┌──────┐  ┌────────┐   ┌──────────┐
   │ Step │  │Context │   │Database  │
   │Types │  │Freezing│   │Persistence
   └──────┘  └────────┘   └──────────┘
```

---

## Core Components

### 1. ExecutionContext

**File:** `packages/backend/src/automations/execution/execution-context.ts`

Immutable context passed to each step execution.

```typescript
interface ExecutionContext {
  automationId: string;        // Automation identifier
  executionId: string;         // Unique execution instance
  userId: string;              // Triggering user
  triggerType: string;         // event | scheduled | manual
  triggerData: {};             // Raw trigger payload
  stepOutputs: {};             // Previous step results
  variables: {};               // User-defined variables
  timestamp: string;           // ISO-8601 UTC timestamp
}
```

**Key Properties:**
- **Immutable:** Frozen via `freezeContext()` to prevent side effects
- **Self-Contained:** Contains everything a step needs to execute
- **Sequential:** Updated with each step's output

### 2. ExecutionService

**File:** `packages/backend/src/automations/execution/execution.service.ts`

Orchestrates workflow execution.

```typescript
class ExecutionService {
  registerStepHandler(type: string, handler: StepHandler): void
  executeWorkflow(
    workflow: WorkflowConfig,
    automationId: string,
    userId: string,
    triggerType: string,
    triggerData: Record<string, unknown>,
    variables?: Record<string, unknown>
  ): Promise<{ execution, steps }>
}
```

**Execution Flow:**

1. **Build Initial Context** - From automation config + trigger
2. **Loop Through Steps** - Sequential execution
   - Build immutable context copy
   - Get handler for step type
   - Execute handler with context
   - Capture output/errors
   - Store step result
   - Update stepOutputs for next step
3. **Determine Status** - Success if all steps pass, failed if any step fails
4. **Persist Results** - Store execution + steps to database

### 3. Step Handlers

Step handlers are registered implementations for each step type.

```typescript
type StepHandler = (
  config: Record<string, unknown>,
  context: ExecutionContext
) => Promise<Record<string, unknown>>;
```

**Example:**
```typescript
service.registerStepHandler('webhook', async (config, context) => {
  const { url, method } = config;
  const response = await fetch(url, {
    method,
    body: JSON.stringify(context.triggerData),
  });
  return { status: response.status, body: await response.json() };
});
```

### 4. Legacy Adapter

**File:** `packages/backend/src/automations/execution/legacy-adapter.ts`

Transparently converts Wave 2 automations.

```typescript
// Wave 2 automation
{
  id: 'auto-1',
  type: 'webhook',
  config: { url: '...' }
}

// Converted to Wave 3 workflow
{
  id: 'auto-1',
  version: 2,  // Marked as converted
  steps: [{
    id: 'legacy-step-1',
    type: 'webhook',
    config: { url: '...' }
  }]
}
```

---

## Data Models

### AutomationExecution

**Table:** `automation_executions`

Tracks overall workflow execution.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `automation_id` | UUID | FK to automations |
| `user_id` | UUID | FK to auth.users |
| `status` | VARCHAR(20) | pending/running/success/failed |
| `trigger_type` | VARCHAR(50) | event/scheduled/manual |
| `trigger_data` | JSONB | Raw trigger payload |
| `started_at` | TIMESTAMP | Execution start (ISO-8601) |
| `completed_at` | TIMESTAMP | Execution end (ISO-8601) |
| `duration_ms` | INTEGER | Total duration |
| `error_context` | JSONB | Error details if failed |
| `created_at` | TIMESTAMP | Record creation time |

**Indexes:**
- `automation_id` - Query executions for specific automation
- `user_id` - Query user's executions
- `status` - Filter by status
- `created_at` - Sort by recency

### ExecutionStep

**Table:** `automation_steps`

Tracks individual step execution.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `execution_id` | UUID | FK to automation_executions |
| `step_id` | VARCHAR(100) | Step identifier |
| `status` | VARCHAR(20) | pending/running/success/failed |
| `input` | JSONB | Step input (context snapshot) |
| `output` | JSONB | Step output (nullable) |
| `error_message` | TEXT | Error message if failed |
| `error_context` | JSONB | Stack trace + state |
| `started_at` | TIMESTAMP | Step start time |
| `completed_at` | TIMESTAMP | Step end time |
| `duration_ms` | INTEGER | Step duration |
| `created_at` | TIMESTAMP | Record creation time |

**Indexes:**
- `execution_id` - Get steps for execution
- `status` - Filter by status
- `created_at` - Sort by recency
- `step_id` - Query specific step type

---

## Execution Flow

### Example: Multi-Step Webhook Workflow

```
Automation Config:
{
  id: "multi-step-webhook",
  version: 3,
  steps: [
    { id: "validate", type: "conditional", config: { ... } },
    { id: "transform", type: "transform", config: { ... } },
    { id: "send", type: "webhook", config: { url: "..." } }
  ]
}

Trigger: { eventType: "user.created", userId: "u123", email: "..." }

Execution:

1. ExecutionService.executeWorkflow()
   ├─ Build ExecutionContext:
   │  ├ automationId: "multi-step-webhook"
   │  ├ executionId: "exec-abc123"
   │  ├ userId: "u123"
   │  ├ triggerType: "event"
   │  ├ triggerData: { eventType: "user.created", ... }
   │  ├ stepOutputs: {}
   │  └ timestamp: "2026-03-02T14:30:00Z"
   │
   ├─ Step 1: Validate
   │  ├ Get handler for "conditional"
   │  ├ Execute with context
   │  └ Output: { valid: true }
   │
   ├─ Step 2: Transform
   │  ├ Context now includes: stepOutputs = { validate: { valid: true } }
   │  ├ Execute transform handler
   │  └ Output: { transformed: { ... } }
   │
   └─ Step 3: Send Webhook
      ├ Context includes: stepOutputs = { validate, transform }
      ├ Send to webhook URL with full context
      └ Output: { status: 200, body: {...} }

2. Store Results:
   ├ AutomationExecution: { id, automationId, status: 'success', ... }
   ├ ExecutionStep 1: { stepId: 'validate', status: 'success', ... }
   ├ ExecutionStep 2: { stepId: 'transform', status: 'success', ... }
   └ ExecutionStep 3: { stepId: 'send', status: 'success', ... }
```

---

## Error Handling

### Error Scenarios

**1. Step Execution Fails:**
```
Step Status: failed
Step Error: "HTTP 500: Internal Server Error"
Step ErrorContext: {
  message: "HTTP 500: Internal Server Error",
  stack: "at fetch() in webhook-handler.ts:45",
  state: {
    previousSteps: [
      { id: 'validate', status: 'success' }
    ],
    context: { automationId: 'auto-1', userId: 'user-1' }
  }
}

Workflow Status: failed (unless onError: 'continue')
```

**2. Missing Step Handler:**
```
Error: "No handler registered for step type: unknown-type"
Handled: ✓ (caught in try-catch)
Stored: ✓ (error_context in database)
```

**3. Context Mutation Attempt:**
```
// Step handler tries to mutate context
context.automationId = 'hacked';  // Fails silently (frozen object)
```

### Error Recovery

- **Async Database Inserts:** Execution tracking doesn't block step execution
- **Full Context Capture:** Every error includes state snapshot for debugging
- **No Cascading Failures:** Failed step doesn't corrupt subsequent steps

---

## Backwards Compatibility

### Wave 2 → Wave 3 Conversion

**Before (Wave 2):**
```typescript
const automation = {
  id: 'webhook-auto-1',
  type: 'webhook',
  config: { url: 'https://api.example.com' }
};

// Execution: Direct call to webhook handler
const result = await webhookHandler(automation.config, context);
```

**After (Wave 3):**
```typescript
const workflow = convertLegacyAutomation(automation);
// Result: { id: 'webhook-auto-1', version: 2, steps: [...] }

// Execution: Through ExecutionService
const { execution, steps } = await service.executeWorkflow(workflow, ...);
// Same result structure, API unchanged
```

**Guarantees:**
- ✅ API endpoints unchanged (POST/GET /api/automations)
- ✅ Dashboard list shows all automations identically
- ✅ Execution results format compatible
- ✅ No visible changes to end users

---

## Testing Strategy

### Unit Tests (`execution.service.test.ts`)
- Sequential step execution
- Context passing between steps
- Error handling and recovery
- Context immutability
- Builder pattern validation

### Integration Tests (`legacy-automation.integration.test.ts`)
- Wave 2 automation conversion
- Execution output compatibility
- Trigger data preservation
- Concurrent execution isolation
- API endpoint compatibility

### Performance Tests (`execution-performance.test.ts`)
- P99 latency <500ms (single-step)
- No regression vs Wave 2
- Context construction <10ms
- 1MB payload handling
- 100+ concurrent executions

---

## Monitoring & Observability

### Key Metrics

```sql
-- Last 50 executions for automation
SELECT * FROM automation_executions
WHERE automation_id = 'auto-1'
ORDER BY created_at DESC
LIMIT 50;

-- Average duration by step type
SELECT step_id, AVG(duration_ms) as avg_duration
FROM automation_steps
GROUP BY step_id
ORDER BY avg_duration DESC;

-- Failure rate by automation
SELECT automation_id,
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'failed' THEN 1 END) as failures,
       ROUND(100 * COUNT(CASE WHEN status = 'failed' THEN 1 END) / COUNT(*)) as failure_rate
FROM automation_executions
GROUP BY automation_id
ORDER BY failure_rate DESC;
```

### Error Context Debugging

```typescript
const { errorContext } = failedStep;
// {
//   message: "HTTP 500: Internal Server Error",
//   stack: "Error: HTTP 500...\n    at fetch()...",
//   state: {
//     previousSteps: [...],
//     context: { automationId, userId, ... }
//   }
// }
```

---

## Future Enhancements

Wave 3+ will build on this foundation:

- **3.2:** Webhook Reliability (retry, exponential backoff, DLQ)
- **3.3:** Scheduled Automations (cron, scheduler service)
- **3.4:** Multi-Step Workflows (advanced routing, looping)
- **3.5:** Conditional Logic (if/else, switch)
- **3.6:** Variables & State (persistence between steps)
- **3.7:** Integration Marketplace (pre-built step types)

---

## References

- **Story:** docs/stories/3.1.story.md
- **Database Schema:** supabase/migrations/20260302_create_execution_tables.sql
- **Tests:** packages/backend/src/__tests__/execution*.test.ts
- **Legacy Adapter:** packages/backend/src/automations/execution/legacy-adapter.ts
