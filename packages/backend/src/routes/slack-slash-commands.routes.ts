import { Router, Request, Response } from 'express';
import { SlackSlashCommandService } from '../services/slack-slash-command.service';

const router = Router();
const slackSlashCommand = new SlackSlashCommandService();

/**
 * POST /slack/slash-commands
 * Handle Slack slash commands
 * Validates request signature and processes /automation command
 */
router.post('/slash-commands', async (req: Request, res: Response) => {
  try {
    // Validate Slack request signature
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const signature = req.headers['x-slack-signature'] as string;
    const signingSecret = process.env.SLACK_SIGNING_SECRET || '';

    if (!SlackSlashCommandService.validateSlashCommand(timestamp, signature, JSON.stringify(req.body), signingSecret)) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    const { command, text } = req.body;

    if (command === '/automation') {
      const response = await slackSlashCommand.handleAutomationCommand(req.body, signingSecret);
      res.json(response);
    } else {
      res.status(400).json({ error: `Unknown command: ${command}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to process slash command: ${message}` });
  }
});

export default router;
