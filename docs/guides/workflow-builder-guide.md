# Workflow Builder Guide

## Overview

The Workflow Builder enables you to create complex, multi-step automations with conditional logic. Instead of single-step automations (Wave 2), Wave 3 workflows support:

- **Multi-step sequences** — Execute actions in a defined order
- **Conditional branching** — Route execution based on trigger data or step outputs
- **Dead-branch skipping** — Skip unnecessary steps for efficiency
- **Template reusability** — Save and reuse workflow patterns

## Quick Start

### Creating Your First Workflow

1. **Open Automation Editor** → Navigate to an automation and click "Build Workflow"
2. **Add Steps** — Click empty canvas to add steps:
   - Trigger (data source)
   - Action (do something)
   - Decision (if/then/else logic)
   - Aggregate (merge results)
3. **Define Dependencies** — Click nodes to connect execution order
4. **Save** — Click "Save Workflow" to persist

### Example: Email-Based User Onboarding

```
Trigger: New User Signup
  ↓
Decision: User premium account?
  ├─ Yes → Send premium welcome email
  └─ No → Send standard welcome email
  ↓
Action: Add user to mailing list
```

**Implementation Steps:**

1. Click canvas → Add "Trigger" step
   - Type: `trigger`
   - Name: `New User Signup`

2. Click canvas → Add "Decision" step
   - Type: `decision`
   - Name: `Account Type Check`
   - Expression: `trigger.account_type == 'premium'`

3. Click canvas → Add two Action steps
   - Premium: `Send Premium Email`
   - Standard: `Send Standard Email`

4. Click canvas → Add "Action" step
   - Name: `Add to Mailing List`

5. Connect dependencies:
   - Decision depends on Trigger
   - Premium Email depends on Decision (true branch)
   - Standard Email depends on Decision (false branch)
   - Mailing List depends on both emails

6. Save workflow

---

## Components

### 1. DAG Visualization

The Directed Acyclic Graph (DAG) visualizes your workflow structure.

**Node Types:**
- 🟢 **Trigger** — Receives input data
- 🔵 **Action** — Executes a task
- 🟡 **Decision** — Conditional branching
- 🟣 **Aggregate** — Merges multiple branches

**Interactions:**
- **Click node** — Select to edit in right panel
- **Click canvas** — Add new step at position
- **Hover + delete button** — Remove step

**Performance:**
- Renders 50 steps in <500ms
- Supports unlimited complexity (no practical limit)
- Smooth panning/zooming for large workflows

### 2. Conditional Branch Editor

Define if/then/else logic with expressions.

**Supported Operators:**

```
Equality:     ==    !=
Comparison:   <     >     <=    >=
Logical:      AND   OR    NOT
Variables:    trigger.*   previous.*
```

**Expression Examples:**

```typescript
// Simple equality
trigger.status == 'active'

// Comparison
trigger.retry_count < 3

// Logical operators
trigger.premium == true AND previous.email_sent == true

// Complex conditions
NOT (trigger.error == 'TIMEOUT') AND trigger.retry_count < 5
```

**Available Variables:**

- **trigger.*** — Any property from trigger data
  - Example: `trigger.user_id`, `trigger.email`, `trigger.amount`
- **previous.*** — Output from the previous step
  - Example: `previous.success`, `previous.user_created_at`

**Branch Selection:**

After defining the expression:
1. Select step for "If TRUE" branch
2. Select step for "If FALSE" branch
3. Both branches execute in parallel (logically)
4. Only active branches consume resources

### 3. Workflow Template Manager

Save and reuse workflow patterns.

**Saving a Template:**

1. Click "Save as Template"
2. Enter template name: "Email Decision Pattern"
3. Click Save
4. Template saved with current steps, dependencies, and conditions

**Loading a Template:**

1. Scroll to "Workflow Templates"
2. Click "Load" on desired template
3. Workflow populated with template steps
4. Modify as needed for your automation

**Template Metadata:**

Each template includes:
- **Name** — Human-readable template name
- **Description** — What the template does
- **Version** — Tracks updates
- **Usage Count** — How many automations use this template

---

## Advanced Patterns

### Pattern 1: Diamond Dependency (Parallel Paths)

```
       Trigger
        ↙   ↘
    Path A   Path B
        ↖   ↗
      Aggregate
```

**Use Case:** Fetch data from multiple sources in parallel, then merge results.

**Implementation:**
- Trigger step
- Two independent action steps (no dependency on each other)
- Aggregate step depends on both actions

### Pattern 2: Nested Conditionals

```
Decision 1: Is urgent?
├─ Yes → Decision 2: Is VIP customer?
│   ├─ Yes → Alert executive
│   └─ No → Send standard alert
└─ No → Log to system
```

**Use Case:** Route based on multiple conditions.

**Implementation:**
- Decision 1: `trigger.urgent == true`
  - True branch: Decision 2
  - False branch: Log action
- Decision 2: `trigger.customer_type == 'vip'`
  - True branch: Alert executive
  - False branch: Standard alert

### Pattern 3: Conditional Aggregation

```
Trigger → Processing Branch A
       ↘ Processing Branch B
        ↖ Aggregate (merge results if both succeed)
```

**Use Case:** Execute parallel branches, only aggregate if conditions met.

**Implementation:**
- Set conditions in decision steps
- Both branches execute independently
- Aggregate step collects outputs from whichever branches executed

---

## Dry-Run Testing

Test workflows without executing for real.

**Steps:**

1. Click "Dry Run" button
2. Enter trigger data as JSON:
   ```json
   {
     "user_id": 123,
     "email": "test@example.com",
     "account_type": "premium"
   }
   ```
3. Click "Execute Dry Run"
4. View execution trace:
   - Each step executed (or skipped)
   - Condition evaluations (true/false)
   - Step outputs
   - Total execution time

**Example Output:**

```
Step 1: trigger → {user_id: 123, email: "test@example.com"}
Step 2: decision
  Condition: trigger.account_type == 'premium'
  Evaluated: true
  Branch taken: premium_email
  ✓ Skipped: standard_email (dead branch)
Step 3: premium_email → {email_sent: true}
Step 4: mailing_list → {added: true}

Total: 75ms | Status: Completed
```

---

## API Integration

### Workflow CRUD

**Create workflow:**
```bash
POST /api/workflows/{automation_id}
Content-Type: application/json

{
  "name": "User Onboarding",
  "description": "Send welcome email based on account type",
  "steps": [
    {"id": "trigger", "type": "trigger", "name": "New User", "config": {}},
    {"id": "decision", "type": "decision", "name": "Account Check", "config": {
      "condition": "trigger.premium == true",
      "true_branch": "premium_email",
      "false_branch": "standard_email"
    }},
    {"id": "premium_email", "type": "action", "name": "Premium Email", "config": {}}
  ],
  "dependencies": {
    "decision": ["trigger"],
    "premium_email": ["decision"],
    "standard_email": ["decision"]
  }
}
```

**Execute workflow:**
```bash
POST /api/workflows/{automation_id}/execute
Content-Type: application/json

{
  "trigger_data": {
    "user_id": 123,
    "email": "user@example.com",
    "premium": true
  }
}
```

**Dry-run workflow:**
```bash
POST /api/workflows/{automation_id}/dry-run
Content-Type: application/json

{
  "trigger_data": {
    "user_id": 123,
    "email": "user@example.com",
    "premium": false
  }
}
```

### Execution History

**Query step-level details:**
```bash
GET /api/workflows/executions/{execution_id}/steps
```

**Response:**
```json
[
  {
    "step_id": "trigger",
    "status": "completed",
    "duration_ms": 10,
    "input_context": {"user_id": 123},
    "step_output": {"user_id": 123}
  },
  {
    "step_id": "decision",
    "status": "completed",
    "condition_expression": "trigger.premium == true",
    "condition_evaluated_to": true,
    "taken_branch": "premium_email",
    "duration_ms": 5
  }
]
```

---

## Best Practices

### 1. Express Conditions Clearly

❌ **Bad:**
```typescript
trigger.x == true AND trigger.y > trigger.z
```

✅ **Good:**
```typescript
trigger.is_premium == true AND trigger.credit_score > 700
```

**Why:** Variable names should be self-documenting.

### 2. Keep Conditions Simple

❌ **Bad:**
```typescript
(trigger.a == true AND trigger.b == false) OR (trigger.c > 10 AND NOT trigger.d)
```

✅ **Good:**
```typescript
trigger.is_eligible == true AND trigger.credit_score > 700
```

**Why:** Complex conditions are hard to debug. Use nested decisions instead.

### 3. Handle Errors

❌ **Bad:** No error handling in action steps

✅ **Good:**
```
Trigger → Try Action
        ↘ If failed → Log Error → Retry or Alert
```

**Why:** Workflows should gracefully handle failures.

### 4. Document Workflow Purpose

- Give clear names to steps: `Email Premium User` not `action_5`
- Use meaningful decision conditions: `Is Premium?` not `trigger.x == 'p'`
- Add descriptions to templates

**Why:** Future maintainers (or you!) will understand faster.

### 5. Test with Dry-Run First

Always test with realistic trigger data before enabling automation.

---

## Troubleshooting

### "Invalid expression" Error

**Problem:** Conditional expression shows error in red border.

**Solution:**
1. Check operator spelling: `==` not `=`, `AND` not `&&`
2. Verify variable names: `trigger.email` not `trigger.user_email`
3. Check parentheses are balanced
4. Use quotes for strings: `trigger.status == 'active'`

### "Circular dependency detected"

**Problem:** Cannot save workflow - circular dependency error.

**Solution:**
1. Check your dependencies in DAG
2. Ensure no step depends on itself (directly or indirectly)
3. Example problem: `A → B → C → A` creates cycle
4. Remove the problematic dependency

### Workflow executes but wrong branch taken

**Problem:** Expected branch A but branch B executed.

**Solution:**
1. Use dry-run to test the condition
2. Verify trigger data matches what condition expects
3. Check variable names and capitalization
4. Test condition with sample data:
   - `trigger.status == 'active'` with `{"status": "active"}`

### Performance lag with large workflows

**Problem:** DAG visualization slow to render.

**Solution:**
1. Optimize layout: Group related steps
2. Use templates for common patterns
3. Break very large workflows into multiple automations
4. File issue if >100 steps are legitimately needed

---

## Examples

### Example 1: E-Commerce Order Confirmation

Send different emails based on order value and customer type.

```
Trigger: New Order
  ↓
Decision: High-value order? (amount > 100)
├─ Yes:
│   Decision: Is loyal customer?
│   ├─ Yes → Send VIP email + extra discount
│   └─ No → Send premium email
└─ No:
    Send standard confirmation
  ↓
Add to analytics
```

### Example 2: API Integration with Retry

Call external API with fallback.

```
Trigger: Request received
  ↓
Action: Call external API
  ↓
Decision: API succeeded?
├─ Yes → Process response
└─ No:
    Decision: Retry count < 3?
    ├─ Yes → Retry API call
    └─ No → Send to dead letter queue
```

### Example 3: Multi-Channel Notification

Send notification to multiple channels based on urgency.

```
Trigger: Alert received
  ↓
Decision: Is critical?
├─ Yes:
│   Action: Send SMS
│   Action: Send Email
│   Action: Call webhook
│   ↓
│   Aggregate: All notifications sent
└─ No:
    Action: Send Email only
```

---

## Migration from Wave 2

### Automatic Migration

Wave 2 automations (single-step: trigger → action) automatically migrate to Wave 3:

```
Wave 2:  Trigger config → Action config
  ↓ (auto-migrate)
Wave 3:  Trigger step → Action step (no conditions)
```

**No action needed!** Existing automations work identically.

### Extending Wave 2 Automations

To add branching to migrated automations:

1. Open automation in Workflow Builder
2. Add Decision step between trigger and action
3. Create two paths (true/false)
4. Save

Your automation now has conditional logic while preserving existing behavior.

---

## API Comparison: Wave 2 vs Wave 3

| Feature | Wave 2 | Wave 3 |
|---------|--------|--------|
| Steps | Single (trigger → action) | Multiple (unlimited) |
| Branching | None | Conditional if/then/else |
| Context passing | Limited | Full between all steps |
| Error handling | Basic | Per-step with dead-branch skip |
| Templates | Manual copies | Built-in template manager |
| Testing | Limited | Full dry-run with trace |
| Execution audit | Basic | Step-level audit log |

---

## Getting Help

- **Documentation:** See `docs/api/workflows.md` for API reference
- **Issues:** Report bugs in GitHub Issues with tag `workflow-builder`
- **Examples:** Check `docs/examples/workflows/` for complete examples
- **Community:** Discuss in team Slack #automations

---

## Version History

- **v1.0** (2026-03-03) — Initial release with conditional branching, templates, dry-run
- Future: Nested conditions, scheduled triggers, webhook integrations

