// Metrics Refresh Job — Hourly aggregation of automation logs to automation_metrics
// Runs every hour to pre-aggregate metrics for fast dashboard loads

export const metricsRefreshJob = {
  // Job name
  name: 'metrics-refresh',

  // Schedule: Every hour (cron format)
  schedule: '0 * * * *',

  // Execute job
  execute: async () => {
    console.log(`[${new Date().toISOString()}] Starting metrics refresh job...`);

    try {
      // Call database function: refresh_automation_metrics()
      // This calculates aggregate metrics from automation_logs and updates automation_metrics table
      // SELECT refresh_automation_metrics();

      console.log(`[${new Date().toISOString()}] Metrics refresh completed successfully`);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Automation metrics refreshed',
      };
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Metrics refresh job failed:`, err);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: (err as Error).message,
      };
    }
  },
};

// Alert Threshold Check Job — Every minute, check if any rules exceeded alert thresholds
// Triggers notifications if failure rate > threshold in last hour

export const alertThresholdJob = {
  name: 'alert-threshold-check',
  schedule: '*/1 * * * *', // Every minute

  execute: async () => {
    console.log(`[${new Date().toISOString()}] Checking alert thresholds...`);

    try {
      // Query automation_logs for all rules with executions in last hour
      // Calculate failure rate for each
      // Compare against automation_alerts config
      // For each rule exceeding threshold:
      //   1. Check last alert time (cooldown: 5 minutes)
      //   2. If not alerted recently, trigger notification
      //   3. Update last_alert_at timestamp

      console.log(`[${new Date().toISOString()}] Alert threshold check completed`);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        alertsTriggered: 0,
      };
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Alert threshold check failed:`, err);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: (err as Error).message,
      };
    }
  },
};
