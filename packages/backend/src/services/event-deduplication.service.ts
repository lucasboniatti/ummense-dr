import { createClient } from '@supabase/supabase-js';

/**
 * Event Deduplication Service
 * Handles UUID-based deduplication with UNIQUE constraint (user_id, event_id, event_type)
 */
export class EventDeduplicationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  /**
   * Check if event already processed
   * @returns true if event exists, false if new
   */
  async isEventDuplicate(
    userId: string,
    eventId: string,
    eventType: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('event_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('event_type', eventType)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (not an error)
      throw new Error(`Dedup check failed: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Get existing event if duplicate
   */
  async getExistingEvent(
    userId: string,
    eventId: string,
    eventType: string
  ) {
    const { data, error } = await this.supabase
      .from('event_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('event_type', eventType)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch existing event: ${error.message}`);
    }

    return data;
  }

  /**
   * Validate deduplication constraint
   * Database enforces UNIQUE (user_id, event_id, event_type)
   * This is the primary dedup mechanism
   */
  validateDeduplicationConstraint(): void {
    // Constraint is enforced at database level
    // This method documents the requirement
    console.log(
      'UNIQUE constraint enforced: (user_id, event_id, event_type)'
    );
  }
}

export const eventDeduplicationService = new EventDeduplicationService();
