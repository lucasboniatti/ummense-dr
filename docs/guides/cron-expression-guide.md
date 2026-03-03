# Cron Expression Guide

Story 3.3: Scheduled Automations & Cron Support

## Overview

Cron expressions define when automated workflows should execute. They follow the standard Unix cron format: `minute hour day month day-of-week`.

## Format

```
┌─── minute (0-59)
│ ┌─── hour (0-23)
│ │ ┌─── day of month (1-31)
│ │ │ ┌─── month (1-12 or JAN-DEC)
│ │ │ │ ┌─── day of week (0-7, 0 and 7 are Sunday)
│ │ │ │ │
* * * * *
```

## Symbols

| Symbol | Description | Example |
|--------|-------------|---------|
| `*` | Any value | `* * * * *` (every minute) |
| `,` | List of values | `0,30 * * * *` (every 30 minutes) |
| `-` | Range of values | `0-5 * * * *` (minutes 0 through 5) |
| `/` | Step values | `*/15 * * * *` (every 15 minutes) |
| `?` | No specific value | `0 9 ? * 1-5` (9am on weekdays) |

## Common Examples

### Every X Minutes/Hours

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour (at minute 0) |
| `0 */2 * * *` | Every 2 hours |
| `0 */6 * * *` | Every 6 hours |

### Daily

| Expression | Description |
|------------|-------------|
| `0 9 * * *` | 9:00 AM every day |
| `0 12 * * *` | 12:00 PM every day (noon) |
| `0 18 * * *` | 6:00 PM every day |
| `0 0 * * *` | 12:00 AM every day (midnight) |
| `30 9 * * *` | 9:30 AM every day |
| `0 9-17 * * *` | 9:00 AM to 5:00 PM every hour |

### Weekly

| Expression | Description |
|------------|-------------|
| `0 9 * * 1` | 9:00 AM every Monday |
| `0 9 * * 1-5` | 9:00 AM Monday-Friday (weekdays) |
| `0 10 * * 0,6` | 10:00 AM Saturday and Sunday |
| `0 9 * * 5` | 9:00 AM every Friday |
| `0 17 * * 5` | 5:00 PM every Friday |

### Monthly

| Expression | Description |
|------------|-------------|
| `0 0 1 * *` | 12:00 AM on the 1st of every month |
| `0 0 15 * *` | 12:00 AM on the 15th of every month |
| `0 0 L * *` | 12:00 AM on the last day of the month |
| `0 9 1 * *` | 9:00 AM on the 1st of every month |
| `0 0 1 1 *` | 12:00 AM on January 1st (New Year) |

### Complex Schedules

| Expression | Description |
|------------|-------------|
| `0 9 * * 1-5` | 9:00 AM every weekday |
| `0 9,17 * * 1-5` | 9:00 AM and 5:00 PM every weekday |
| `*/30 9-17 * * 1-5` | Every 30 minutes during business hours (9am-5pm weekdays) |
| `0 0 * 1,4,7,10 *` | Midnight on 1st day of Jan, Apr, Jul, Oct (quarterly) |
| `0 9 ? * 1#1` | 9:00 AM on the first Monday of every month |

## Day of Week Reference

| Number | Day |
|--------|-----|
| 0 or 7 | Sunday |
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |

## Month Reference

| Number | Month |
|--------|-------|
| 1 | January |
| 2 | February |
| 3 | March |
| 4 | April |
| 5 | May |
| 6 | June |
| 7 | July |
| 8 | August |
| 9 | September |
| 10 | October |
| 11 | November |
| 12 | December |

## Timezone Handling

Each schedule is associated with a timezone (IANA format). The same cron expression will execute at different absolute times depending on the timezone:

- **UTC:** `0 9 * * *` = 9:00 AM UTC
- **America/New_York:** `0 9 * * *` = 9:00 AM EST/EDT
- **America/Sao_Paulo:** `0 9 * * *` = 9:00 AM BRT/BRST
- **Europe/London:** `0 9 * * *` = 9:00 AM GMT/BST

### Common IANA Timezones

| Timezone | UTC Offset | Example Usage |
|----------|-----------|---------------|
| `UTC` | ±0:00 | International standard |
| `America/New_York` | UTC-5/-4 | US East Coast |
| `America/Chicago` | UTC-6/-5 | US Central |
| `America/Denver` | UTC-7/-6 | US Mountain |
| `America/Los_Angeles` | UTC-8/-7 | US West Coast |
| `America/Sao_Paulo` | UTC-3/-2 | Brazil |
| `Europe/London` | UTC±0 | UK |
| `Europe/Paris` | UTC+1/+2 | Central Europe |
| `Asia/Tokyo` | UTC+9 | Japan |
| `Asia/Shanghai` | UTC+8 | China |
| `Australia/Sydney` | UTC+10/+11 | Australia |

## Precision & Drift

The scheduler evaluates cron expressions every 60 seconds. Executions typically occur within ±2 minutes of the scheduled time:

- **Best case:** Within 1 minute (if schedule lands near evaluation cycle)
- **Average case:** ±30-60 seconds
- **Worst case:** ±2 minutes (maximum drift tolerance)

This is expected behavior for distributed systems.

## Creating Schedules

1. Select a **cron expression** using the available presets or write a custom expression
2. Choose a **timezone** (defaults to UTC)
3. Click **Preview** to see the next execution times
4. Click **Create** to activate the schedule

The schedule will begin executing immediately on the next matching cron cycle.

## Modifying Schedules

- **Edit:** Change the cron expression or timezone
- **Toggle:** Enable/disable without deleting the schedule
- **Delete:** Remove the schedule permanently (automation will not execute)

## Execution Logging

All executions are logged to the audit table with:
- **Scheduled time:** When the execution was supposed to happen
- **Execution time:** When it actually happened
- **Drift:** Difference between scheduled and actual time
- **Status:** `success`, `failed`, or `skipped`
- **Error message:** If execution failed

You can view these logs in the scheduler dashboard to diagnose timing issues or failures.

## Common Mistakes

### ❌ Don't do this:

```
# Too frequent (every second)
* * * * *          # Every minute is already very frequent
*/1 * * * *        # Same as above

# Impossible expressions
0 25 * * *         # Hour 25 doesn't exist
0 0 32 * *         # Day 32 doesn't exist
0 0 0 13 *         # Month 13 doesn't exist
```

### ✅ Do this instead:

```
# Reasonable intervals
*/5 * * * *        # Every 5 minutes
0 */2 * * *        # Every 2 hours
0 9 * * *          # Once per day

# Valid expressions
0 23 * * *         # 11 PM
0 0 31 * *         # 31st of months that have 31 days
0 0 1 * *          # 1st of every month
```

## Testing Expressions

The **Preview** feature shows the next 3 execution times based on your cron expression and timezone. Use this to verify your schedule before saving.

Example:
- Expression: `0 9 * * 1-5`
- Timezone: `America/New_York`
- Preview shows: Next 3 weekday executions at 9:00 AM ET

## Troubleshooting

### Schedule not executing?
1. Verify the schedule is **enabled** (not toggled off)
2. Check the preview shows upcoming execution times
3. Review the audit log for execution attempts
4. Ensure the associated automation is configured correctly

### Execution happening at wrong time?
1. Verify you're using the correct **timezone**
2. Check for daylight saving time transitions (can cause ±1 hour shifts)
3. Review the drift in audit logs (usually within ±2 minutes is normal)

### Want to run something now?
1. Use the **Manual Trigger** button to execute immediately
2. This creates an audit log entry with trigger type `scheduled_manual`

## Advanced: Step Values

Step values (`/`) allow you to run a task at intervals:

- `*/5 * * * *` = Every 5 minutes (0, 5, 10, 15, ...)
- `0 */4 * * *` = Every 4 hours at minute 0 (0:00, 4:00, 8:00, ...)
- `0 9-17/2 * * *` = Every 2 hours between 9 AM and 5 PM (9:00, 11:00, 13:00, 15:00, 17:00)

## Resources

- [Cron Expression Parser](https://crontab.guru/) - Visual cron expression builder
- [IANA Timezone Database](https://www.iana.org/time-zones) - Complete timezone list
- [Wikipedia: Cron](https://en.wikipedia.org/wiki/Cron) - Cron specification details
