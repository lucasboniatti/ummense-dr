import { createClient } from '@supabase/supabase-js';

type RollbackHandler = () => Promise<void>;
type ActionExecutionResult = {
  rollback?: RollbackHandler;
};

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
    const rollbackHandlers: RollbackHandler[] = [];
    const results = {
      success: true,
      executedActions: 0,
      errors: [] as string[]
    };

    try {
      // Execute each action in order
      for (const action of actions) {
        try {
          const actionResult = await this.executeAction(action, context);
          if (actionResult.rollback) {
            rollbackHandlers.unshift(actionResult.rollback);
          }
          results.executedActions++;
        } catch (error) {
          const errorMsg = `Action ${action.type} failed: ${error}`;
          results.errors.push(errorMsg);
          results.success = false;

          await this.rollbackExecutedActions(rollbackHandlers, ruleId);
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
  ): Promise<ActionExecutionResult> {
    switch (action.type) {
      case 'update_task':
        return this.updateTask(action.params as any, context);
      case 'create_task':
        return this.createTask(action.params as any, context);
      case 'send_webhook':
        await this.sendWebhook(action.params as any, context);
        return {};
      case 'send_notification':
        return this.sendNotification(action.params as any, context);
      case 'assign_tag':
        return this.assignTag(action.params as any, context);
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
  ): Promise<ActionExecutionResult> {
    if (!params.taskId || !params.fields) {
      throw new Error('update_task requires taskId and fields');
    }

    const { data: existingTask, error: existingTaskError } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', params.taskId)
      .single();

    if (existingTaskError || !existingTask) {
      throw new Error(`Task not found: ${params.taskId}`);
    }

    const previousValues = Object.fromEntries(
      Object.keys(params.fields).map((field) => [field, existingTask[field]])
    );

    const { error } = await this.supabase
      .from('tasks')
      .update(params.fields)
      .eq('id', params.taskId);

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    return {
      rollback: async () => {
        const { error: rollbackError } = await this.supabase
          .from('tasks')
          .update(previousValues)
          .eq('id', params.taskId);

        if (rollbackError) {
          throw new Error(`Failed to rollback task update: ${rollbackError.message}`);
        }
      }
    };
  }

  /**
   * Create new task
   * @param params Parameters: title, description, etc.
   * @param context Current context (may include task template)
   */
  private async createTask(
    params: Record<string, any>,
    context: Record<string, any>
  ): Promise<ActionExecutionResult> {
    if (!params.title) {
      throw new Error('create_task requires title');
    }

    const newTask = {
      ...params,
      created_at: new Date().toISOString()
    };

    const { data: createdTask, error } = await this.supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();

    if (error || !createdTask) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return {
      rollback: async () => {
        const { error: rollbackError } = await this.supabase
          .from('tasks')
          .delete()
          .eq('id', createdTask.id);

        if (rollbackError) {
          throw new Error(`Failed to rollback task creation: ${rollbackError.message}`);
        }
      }
    };
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
  ): Promise<ActionExecutionResult> {
    if (!params.message) {
      throw new Error('send_notification requires message');
    }

    const userId = params.userId || context.userId;
    if (!userId) {
      throw new Error('send_notification requires userId');
    }

    const { data: notification, error } = await this.supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          message: params.message,
          priority: params.priority || 'normal',
          read: false,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error || !notification) {
      throw new Error(`Failed to send notification: ${error.message}`);
    }

    return {
      rollback: async () => {
        const { error: rollbackError } = await this.supabase
          .from('notifications')
          .delete()
          .eq('id', notification.id);

        if (rollbackError) {
          throw new Error(`Failed to rollback notification: ${rollbackError.message}`);
        }
      }
    };
  }

  /**
   * Assign tag to task
   * @param params Parameters: taskId, tagName
   * @param context Current context
   */
  private async assignTag(
    params: { taskId?: string; tagName: string },
    context: Record<string, any>
  ): Promise<ActionExecutionResult> {
    if (!params.tagName) {
      throw new Error('assign_tag requires tagName');
    }

    const taskId = params.taskId || context.taskId;
    if (!taskId) {
      throw new Error('assign_tag requires taskId');
    }

    // Find or create tag
    let tagId: string;
    const { data: existingTag } = await this.supabase
      .from('tags')
      .select('id')
      .eq('name', params.tagName)
      .single();

    let createdTagId: string | null = null;
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
      createdTagId = newTag.id;
    }

    // Create task-tag association
    const { data: taskTagLink, error: linkError } = await this.supabase
      .from('task_tags')
      .insert([{ task_id: taskId, tag_id: tagId }])
      .select()
      .single();

    if (linkError && !linkError.message.includes('duplicate')) {
      throw new Error(`Failed to assign tag: ${linkError.message}`);
    }

    return {
      rollback: async () => {
        if (taskTagLink?.id) {
          const { error: unlinkError } = await this.supabase
            .from('task_tags')
            .delete()
            .eq('id', taskTagLink.id);

          if (unlinkError) {
            throw new Error(`Failed to rollback task tag: ${unlinkError.message}`);
          }
        }

        if (createdTagId) {
          const { data: remainingLinks, error: remainingLinksError } = await this.supabase
            .from('task_tags')
            .select('id')
            .eq('tag_id', createdTagId);

          if (remainingLinksError) {
            throw new Error(
              `Failed to inspect tag rollback dependencies: ${remainingLinksError.message}`
            );
          }

          if (!remainingLinks || remainingLinks.length === 0) {
            const { error: deleteTagError } = await this.supabase
              .from('tags')
              .delete()
              .eq('id', createdTagId);

            if (deleteTagError) {
              throw new Error(`Failed to rollback tag creation: ${deleteTagError.message}`);
            }
          }
        }
      }
    };
  }

  private async rollbackExecutedActions(
    rollbackHandlers: RollbackHandler[],
    ruleId: string
  ): Promise<void> {
    for (const rollback of rollbackHandlers) {
      try {
        await rollback();
      } catch (error) {
        console.error(`[RULE EXECUTION] Rollback failed for rule ${ruleId}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
}

export const ruleExecutionService = new RuleExecutionService();
