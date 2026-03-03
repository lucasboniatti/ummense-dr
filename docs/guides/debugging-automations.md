# Debugging Automations Guide

This guide shows you how to use the Execution History and Audit Log features (Story 3.5) to debug automation failures.

## Table of Contents

- [Accessing Execution History](#accessing-execution-history)
- [Filtering by Status](#filtering-by-status)
- [Analyzing Error Details](#analyzing-error-details)
- [Step-by-Step Breakdown](#step-by-step-breakdown)
- [Using Audit Logs](#using-audit-logs)
- [Exporting Data](#exporting-data)
- [Common Issues](#common-issues)

---

## Accessing Execution History

The Execution History page shows all automation executions with key metrics.

**Path:** `/automations/history`

### Columns

- **Execution ID** - Unique identifier for this execution (click to see detail)
- **Date/Time** - When the execution started
- **Automation** - Name of the automation
- **Status** - success, failed, or skipped
- **Trigger Type** - event, scheduled, or manual
- **Duration** - How long the execution took (milliseconds)

### Navigation

The table is paginated with 50 rows per page. Use the pagination buttons to navigate.

---

## Filtering by Status

### View Only Failures

Select "Falha" (Failed) from the Status dropdown to see only failed executions.

```
Status: Falha
Period: Últimos 7 dias
```

This helps identify patterns in failures.

### Filter by Automation

Select a specific automation to see only its execution history.

### Filter by Date Range

Choose from:
- **24h** - Last 24 hours
- **7d** - Last 7 days
- **30d** - Last 30 days

Custom date ranges coming soon.

---

## Analyzing Error Details

When an execution fails, click on the row to see the **Error Details Panel**.

### Error Panel Contents

1. **Exception Message** - The error message from the failed step
   ```
   TypeError: Cannot read property 'email' of undefined
   ```

2. **Stack Trace** - File paths and line numbers where error occurred
   ```
   at Object.<anonymous> (/app/src/steps/email.ts:45:12)
   at async executeStep (/app/src/execution.ts:123:45)
   ```

3. **State Snapshot** - JSON of the execution state when error occurred
   ```json
   {
     "stepOutputs": { "previous_step": "value" },
     "variables": { "user_id": "123" },
     "triggerData": { "email": null }
   }
   ```

### Debugging Steps

1. **Read the message** - Understand what went wrong
2. **Check the stack trace** - Find the exact file and line
3. **Review the state snapshot** - See what data was available
4. **Compare with previous success** - Find what changed

---

## Step-by-Step Breakdown

Each execution consists of multiple steps. The detail page shows them in a timeline.

### Expand a Step

Click on any step to see:
- **Input** - Data passed to this step
- **Output** - Result from this step
- **Duration** - How long this step took

### Typical Flow

```
Step 1: Fetch user data
  Input: { user_id: "123" }
  Output: { name: "John", email: "john@example.com" }
  Duration: 245ms

Step 2: Send email
  Input: { email: "john@example.com", subject: "Welcome" }
  Output: { message_id: "msg_456" }
  Duration: 1200ms

Step 3: Update user profile
  Input: { user_id: "123", email_sent: true }
  Output: null (error)
  Error: Cannot connect to database
```

### Finding the Root Cause

1. Identify the first failing step
2. Check its input - was the data correct?
3. Check the previous step's output - did it produce what's expected?
4. Look at the error message on the failed step

---

## Using Audit Logs

Audit logs show ALL user actions on automations:

- **Create automation**
- **Modify automation**
- **Delete automation**
- **Enable schedule**
- **Disable schedule**
- **Manual retry**

**Path:** `/automations/audit-log`

### Finding Changes

If an automation started failing recently:

1. Go to Audit Logs
2. Find entries for that automation
3. Check the "Modify automation" actions
4. Compare old vs new values to see what changed

### Example

```
Action: modify_automation
Date: Mar 3, 2026, 10:15 AM

Old Values:
  webhook_url: "https://old-api.example.com/hook"

New Values:
  webhook_url: "https://new-api.example.com/hook"
```

This might explain why webhook calls started failing!

---

## Exporting Data

### CSV Export

Export execution history as CSV for analysis in Excel:

1. Set your filters (status, date range, automation)
2. Click "Exportar CSV"
3. Opens a download dialog

**Columns included:**
- Execution ID
- Automation Name
- Status
- Trigger Type
- Started At
- Completed At
- Duration (ms)
- Error Message

### JSON Export

Export complete execution context as JSON for deeper analysis:

1. Click "Exportar JSON"
2. Get a JSON file with all execution data
3. Use for programmatic analysis or data import

**Useful for:**
- Comparing multiple failures
- Building custom dashboards
- Importing into analytics tools

---

## Common Issues

### "Execution not found"

Possible causes:
- Execution was deleted (outside retention window)
- Wrong execution ID
- User permission issue

**Solution:** Check your retention policy in Settings → Automation Settings

### "No steps found"

This can happen if:
- Execution started but didn't run any steps
- Steps were deleted from database

**Solution:** Check the error details panel instead

### "State snapshot missing"

The state snapshot is only captured when errors occur.

For successful executions, check the step Input/Output instead.

### "Permission denied"

You can only see your own execution history.

If you think you should have access, contact your administrator.

---

## Performance Tips

1. **Narrow your date range** - Querying 1 year of data is slow
2. **Filter by automation** - Don't load all executions
3. **Export strategically** - CSV for analysis, JSON for archival
4. **Archive old data** - Enable S3 archival in retention settings

---

## Next Steps

- [Story 3.6: Real-Time Dashboard](../architecture/execution-engine-guide.md) - Live execution monitoring
- [Story 3.4: Scheduled Automations](./scheduled-automations.md) - Setting up recurring automations
- [Story 3.1: Execution Engine](../architecture/execution-engine-guide.md) - Understanding how executions work
