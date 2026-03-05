import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /product-parity\.e2e\.ts/,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  webServer: {
    command:
      'PORT=3010 NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001 npm run dev --workspace @ummense/frontend',
    url: 'http://127.0.0.1:3010',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.PARITY_BASE_URL || 'http://127.0.0.1:3010',
    trace: 'off',
  },
});
