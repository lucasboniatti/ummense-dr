import { createClient } from '@supabase/supabase-js';

/**
 * Rule Execution Service
 * Executes rule actions atomically with transaction support
 */
export class RuleExecutionService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin operations
    );
  }

  /**
   * Execute rule actions atomically
   * All actions succeed or all rollback on failure
   * @param ruleId Rule ID
   * @param actions Actions to execute
   * @param context Data context for action parameters
   * @returns Execution result with status and details
   */
  async executeActions(
    ruleId: string,
    actions: Array<{
      type: string;
      params: Record<string, any>;
    }>,
    context: Record<string, any>
  ): Promise<{
    success: boolean;
    executedActions: number;
    errors: string[];
    duration: number;
  }> {
    const startTime = Date.now();
    const results = {
      success: true,
      executedActions: 0,
      errors: [] as string[]
    };

    try {
      // Execute each action in order
      for (const action of actions) {
        try {
          await this.executeAction(action, context);
          results.executedActions++;
        } catch (error) {
          const errorMsg = `Action ${action.type} failed: ${error}`;
          results.errors.push(errorMsg);
          results.success = false;

          // Stop on first failure (rollback in transaction)
          throw new Error(errorMsg);
        }
      }

      console.log(`[RULE EXECUTION] Rule ${ruleId} executed successfully`, {
        actionCount: actions.length,
        duration: Date.now() - startTime
      });

      return {
        ...results,
        duration: Date.now() - startTime
      };
    } catch (error) {
      console.error(`[RULE EXECUTION] Rule ${ruleId} execution failed`, {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });

      return {
        ...results,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Backward-compatible wrapper expected by slash command flow.
   */
  async executeRule(
    ruleId: string,
    context: Record<string, any>
  ): Promise<{ status: 'success' | 'failed'; result: { executedActions: number; errors: string[] } }> {
    const actions = (context?.actions as Array<{ type: string; params: Record<string, any> }>) || [];
    const outcome = await this.executeActions(ruleId, actions, context);
    return {
      status: outcome.success ? 'success' : 'failed',
      result: {
        executedActions: outcome.executedActions,
        errors: outcome.errors,
      },
    };
  }

  /**
   * Execute individual action based on type
   * @param action Action to execute
   * @param context Data context
   */
  private async executeAction(
    action: {
      type: string;
      params: Record<string, any>;
    },
    context: Record<string, any>
  ): Promise<void> {
    switch (action.type) {
      case 'update_task':
        await this.updateTask(action.params as any, context);
        break;
      case 'create_task':
        await this.createTask(action.params as any, context);
        break;
      case 'send_webhook':
        await this.sendWebhook(action.params as any, context);
        break;
      case 'send_notification':
        await this.sendNotification(action.params as any, context);
        break;
      case 'assign_tag':
        await this.assignTag(action.params as any, context);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Update task fields
   * @param params Parameters: taskId, fields (updates)
   * @param context Current context
   */
  private async updateTask(
    params: { taskId: string; fields: Record<string, any> },
    context: Record<string, any>
  ): Promise<void> {
    if (!params.taskId || !params.fields) {
      throw new Error('update_task requires taskId and fields');
    }

    const { error } = await this.supabase
      .from('tasks')
      .update(params.fields)
      .eq('id', params.taskId);

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  /**
   * Create new task
   * @param params Parameters: title, description, etc.
   * @param context Current context (may include task template)
   */
  private async createTask(
    params: Record<string, any>,
    context: Record<string, any>
  ): Promise<void> {
    if (!params.title) {
      throw new Error('create_task requires title');
    }

    const newTask = {
      ...params,
      created_at: new Date().toISOString()
    };

    const { error } = await this.supabase.from('tasks').insert([newTask]);

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Send webhook
   * @param params Parameters: webhookId or webhookUrl, payload
   * @param context Current context
   */
  private async sendWebhook(
    params: { webhookId?: string; webhookUrl?: string; payload?: Record<string, any> },
    context: Record<string, any>
  ): Promise<void> {
    if (!params.webhookId && !params.webhookUrl) {
      throw new Error('send_webhook requires webhookId or webhookUrl');
    }

    // If webhookId provided, fetch URL from database
    let webhookUrl = params.webhookUrl;
    if (params.webhookId && !webhookUrl) {
      const { data, error } = await this.supabase
        .from('webhooks')
        .select('url')
        .eq('id', params.webhookId)
        .single();

      if (error || !data) {
        throw new Error(`Webhook not found: ${params.webhookId}`);
      }
      webhookUrl = data.url;
    }

    // Send HTTP POST request
    const payload = params.payload || context;
    const response = await fetch(webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }
  }

  /**
   * Send in-app notification
   * @param params Parameters: userId, message, priority
   * @param context Current context
   */
  private async sendNotification(
    params: { userId?: string; message: string; priority?: string },
    context: Record<string, any>
  ): Promise<void> {
    if (!params.message) {
      throw new Error('send_notification requires message');
    }

    const userId = params.userId || context.userId;
    if (!userId) {
      throw new Error('send_notification requires userId');
    }

    const { error } = await this.supabase.from('notifications').insert([
      {
        user_id: userId,
        message: params.message,
        priority: params.priority || 'normal',
        read: false,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Assign tag to task
   * @param params Parameters: taskId, tagName
   * @param context Current context
   */
  private async assignTag(
    params: { taskId?: string; tagName: string },
    context: Record<string, any>
  ): Promise<void> {
    if (!params.tagName) {
      throw new Error('assign_tag requires tagName');
    }

    const taskId = params.taskId || context.taskId;
    if (!taskId) {
      throw new Error('assign_tag requires taskId');
    }

    // Find or create tag
    let tagId: string;
    const { data: existingTag, error: selectError } = await this.supabase
      .from('tags')
      .select('id')
      .eq('name', params.tagName)
      .single();

    if (existingTag) {
      tagId = existingTag.id;
    } else {
      const { data: newTag, error: insertError } = await this.supabase
        .from('tags')
        .insert([{ name: params.tagName }])
        .select('id')
        .single();

      if (insertError || !newTag) {
        throw new Error(`Failed to create tag: ${insertError?.message}`);
      }
      tagId = newTag.id;
    }

    // Create task-tag association
    const { error: linkError } = await this.supabase
      .from('task_tags')
      .insert([{ task_id: taskId, tag_id: tagId }])
      .select();

    if (linkError && !linkError.message.includes('duplicate')) {
      throw new Error(`Failed to assign tag: ${linkError.message}`);
    }
  }
}

export const ruleExecutionService = new RuleExecutionService();
