/**
 * Analytics Service
 * Tracks webhook management UI events for observability
 */

export interface AnalyticsEvent {
  event: string;
  category: string;
  timestamp?: string;
  userId?: string;
  webhookId?: string;
  metadata?: Record<string, any>;
}

import { apiClient } from './api.client';

class AnalyticsService {
  private endpoint = '/analytics/events';

  /**
   * Track webhook creation
   */
  trackWebhookCreated(webhookId: string, metadata?: any) {
    this.trackEvent({
      event: 'webhook.created',
      category: 'webhook_management',
      webhookId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track webhook update
   */
  trackWebhookUpdated(webhookId: string, changes?: string[]) {
    this.trackEvent({
      event: 'webhook.updated',
      category: 'webhook_management',
      webhookId,
      metadata: {
        changedFields: changes,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track webhook deletion
   */
  trackWebhookDeleted(webhookId: string) {
    this.trackEvent({
      event: 'webhook.deleted',
      category: 'webhook_management',
      webhookId,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track test webhook execution
   */
  trackWebhookTested(webhookId: string, eventType: string, success: boolean, elapsed: number) {
    this.trackEvent({
      event: 'webhook.tested',
      category: 'webhook_testing',
      webhookId,
      metadata: {
        eventType,
        success,
        elapsedMs: elapsed,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track delivery history filtering
   */
  trackDeliveryHistoryFiltered(webhookId: string, filters: Record<string, any>) {
    this.trackEvent({
      event: 'delivery.filtered',
      category: 'webhook_management',
      webhookId,
      metadata: {
        appliedFilters: filters,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track delivery inspection
   */
  trackDeliveryInspected(webhookId: string, deliveryId: string) {
    this.trackEvent({
      event: 'delivery.inspected',
      category: 'webhook_debugging',
      webhookId,
      metadata: {
        deliveryId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track webhook list viewed
   */
  trackWebhookListViewed(count: number) {
    this.trackEvent({
      event: 'webhook_list.viewed',
      category: 'webhook_management',
      metadata: {
        webhookCount: count,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track webhook detail viewed
   */
  trackWebhookDetailViewed(webhookId: string) {
    this.trackEvent({
      event: 'webhook_detail.viewed',
      category: 'webhook_management',
      webhookId,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Generic event tracking
   */
  private trackEvent(event: AnalyticsEvent) {
    event.timestamp = new Date().toISOString();

    // Send to backend asynchronously (fire and forget)
    this.sendEventToBackend(event).catch((err) => {
      // Silently fail - don't break user experience
      console.debug('Analytics event failed to send:', err);
    });

    // Also log locally for debugging
    console.debug('[Analytics]', event.event, event.metadata);
  }

  /**
   * Send event to backend
   */
  private async sendEventToBackend(event: AnalyticsEvent) {
    try {
      await apiClient.post(this.endpoint, event);
    } catch (error) {
      // Network errors are expected in offline scenarios
      // Don't throw - allow app to continue
    }
  }

  /**
   * Batch track multiple events
   */
  trackBatch(events: AnalyticsEvent[]) {
    events.forEach((event) => this.trackEvent(event));
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
