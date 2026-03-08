import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/backend/tests/oauth-pkce.test.ts',
      'packages/backend/tests/template-engine.test.ts',
      'packages/backend/tests/integration-rate-limiter.test.ts',
      'packages/backend/tests/integration-token.test.ts',
      'packages/backend/tests/slack-integration.test.ts',
      'packages/backend/tests/discord-integration.test.ts',
      'packages/e2e/tests/slack-workflow.e2e.ts',
      'packages/e2e/tests/discord-workflow.e2e.ts',
    ],
  },
});
