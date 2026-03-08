import { supabase } from '../lib/supabase';
import { automationService } from '../services/automation.service';

export const metricsRefreshJob = {
  name: 'metrics-refresh',
  schedule: '0 * * * *',

  async execute() {
    console.log(`[${new Date().toISOString()}] Starting metrics refresh job...`);

    try {
      const { data, error } = await supabase.rpc('refresh_automation_metrics');

      if (error) {
        throw error;
      }

      const metricsUpdated = Array.isArray(data) ? data.length : 0;

      console.log(`[${new Date().toISOString()}] Metrics refresh completed successfully`);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Automation metrics refreshed',
        metricsUpdated,
      };
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Metrics refresh job failed:`, err);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};

export const alertThresholdJob = {
  name: 'alert-threshold-check',
  schedule: '*/1 * * * *',

  async execute() {
    console.log(`[${new Date().toISOString()}] Checking alert thresholds...`);

    try {
      const { data, error } = await supabase
        .from('automation_alerts')
        .select('user_id, rule_id, enabled')
        .eq('enabled', true);

      if (error) {
        throw error;
      }

      let alertsTriggered = 0;

      for (const alert of data ?? []) {
        const result = await automationService.checkAlertThresholds(
          String(alert.user_id),
          String(alert.rule_id)
        );

        if (result.shouldAlert) {
          alertsTriggered += 1;
        }
      }

      console.log(`[${new Date().toISOString()}] Alert threshold check completed`);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        alertsTriggered,
      };
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Alert threshold check failed:`, err);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
};
