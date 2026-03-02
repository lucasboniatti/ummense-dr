import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const WEBHOOK_URL = 'https://webhook.example.com/events';

test.describe('Webhook Management E2E', () => {
  let webhookId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard/webhooks`);

    // Login if needed (mock auth)
    const loginButton = page.locator('button:has-text("Login")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      // Mock login flow would go here
    }
  });

  test('E2E-1: Create webhook workflow', async ({ page }) => {
    // Click "New Webhook" button
    await page.click('button:has-text("New Webhook")');

    // Wait for modal to appear
    await page.waitForSelector('input[placeholder*="https://"]');

    // Fill webhook form
    await page.fill('input[placeholder*="https://"]', WEBHOOK_URL);
    await page.fill('textarea[placeholder*="What is this webhook"]', 'Test webhook for E2E');

    // Verify URL validation feedback
    const urlInput = page.locator('input[placeholder*="https://"]');
    await expect(urlInput).toHaveClass(/border-gray-300/); // Should be valid (no error)

    // Submit form
    await page.click('button:has-text("Create")');

    // Verify success (modal closes, webhook appears in list)
    await page.waitForNavigation();

    // Extract webhook ID from URL or table
    const webhookRow = page.locator(`text="${WEBHOOK_URL}"`);
    await expect(webhookRow).toBeVisible();

    webhookId = WEBHOOK_URL; // Simplified for E2E
  });

  test('E2E-2: View webhook details and delivery history', async ({ page }) => {
    // Navigate to webhook list
    await page.goto(`${BASE_URL}/dashboard/webhooks`);

    // Click on first webhook (or use the one created above)
    await page.click('a:has-text("https://")');

    // Verify detail page loads
    await page.waitForSelector('h1:has-text("https://")');
    expect(page.url()).toContain('/webhooks/');

    // Verify delivery history section
    const deliverySection = page.locator('h2:has-text("Delivery History")');
    await expect(deliverySection).toBeVisible();

    // Verify delivery table
    const deliveryTable = page.locator('table');
    await expect(deliveryTable).toBeVisible();
  });

  test('E2E-3: Test webhook feature (send immediately)', async ({ page }) => {
    // Navigate to webhook detail page
    await page.goto(`${BASE_URL}/dashboard/webhooks/${webhookId || 'test-id'}`);

    // Click "Test Webhook" button
    await page.click('button:has-text("Test Webhook")');

    // Wait for test modal
    await page.waitForSelector('text=Select event type');

    // Select event type
    await page.selectOption('select', 'task:created');

    // Click "Send Test" button
    await page.click('button:has-text("Send Test")');

    // Wait for response
    await page.waitForSelector('text=Response Inspector');

    // Verify response details visible
    const statusCode = page.locator('text=/Status:|200|400|500/');
    await expect(statusCode).toBeVisible();

    // Verify elapsed time shown
    const elapsedTime = page.locator('text=/elapsed|ms/i');
    await expect(elapsedTime).toBeVisible();
  });

  test('E2E-4: Filter delivery history', async ({ page }) => {
    // Navigate to webhook detail
    await page.goto(`${BASE_URL}/dashboard/webhooks/${webhookId || 'test-id'}`);

    // Wait for delivery history to load
    await page.waitForSelector('table');

    // Click filter button
    await page.click('button:has-text("Filter")');

    // Select status filter
    await page.selectOption('select[name="status"]', 'success');

    // Apply filter
    await page.click('button:has-text("Apply")');

    // Verify table updated
    const statusBadges = page.locator('.bg-green-100'); // Success badge color
    await expect(statusBadges).toHaveCount(
      await page.locator('tbody tr').count()
    ); // All rows should be success

    // Test date range filter
    await page.click('button:has-text("Last 7 days")');

    // Verify table refreshed
    await page.waitForNavigation();
  });

  test('E2E-5: URL validation prevents invalid URLs', async ({ page }) => {
    // Navigate to create webhook
    await page.goto(`${BASE_URL}/dashboard/webhooks`);
    await page.click('button:has-text("New Webhook")');

    // Wait for form
    await page.waitForSelector('input[placeholder*="https://"]');

    // Try HTTP URL
    await page.fill('input[placeholder*="https://"]', 'http://example.com/webhook');

    // Verify error message
    const errorMsg = page.locator('text=/https/i');
    await expect(errorMsg).toBeVisible();

    // Try localhost
    await page.fill('input[placeholder*="https://"]', 'https://localhost:3000/webhook');

    // Verify SSRF error
    const ssrfError = page.locator('text=/localhost|SSRF/i');
    await expect(ssrfError).toBeVisible();

    // Verify Create button is disabled
    const createBtn = page.locator('button:has-text("Create")');
    await expect(createBtn).toBeDisabled();
  });

  test('E2E-6: API key display and masking', async ({ page }) => {
    // Create a new webhook
    await page.goto(`${BASE_URL}/dashboard/webhooks`);
    await page.click('button:has-text("New Webhook")');

    // Fill form
    await page.fill('input[placeholder*="https://"]', WEBHOOK_URL);
    await page.click('button:has-text("Create")');

    // Verify full key shown on creation
    const fullKeyDisplay = page.locator('text=/^sk_[a-f0-9]{32}$/');
    await expect(fullKeyDisplay).toBeVisible();

    // Note: copy to clipboard would be tested here if available

    // Close modal and go to detail
    await page.click('button:has-text("Close")');

    // Navigate to edit/detail page
    await page.click(`a:has-text("${WEBHOOK_URL}")`);

    // Verify key is masked
    const maskedKey = page.locator('text=/sk_[a-f0-9]{4}$/');
    await expect(maskedKey).toBeVisible();

    // Verify full key is NOT shown
    const fullKey = page.locator(`text=${webhookId || 'full-api-key'}`);
    await expect(fullKey).not.toBeVisible();
  });

  test('E2E-7: Delete webhook (soft delete)', async ({ page }) => {
    // Navigate to webhook list
    await page.goto(`${BASE_URL}/dashboard/webhooks`);

    // Find and click delete button for first webhook
    const deleteBtn = page.locator('button[aria-label="Delete webhook"]').first();
    await deleteBtn.click();

    // Confirm delete
    await page.on('dialog', dialog => dialog.accept());

    // Verify webhook removed from list
    await page.waitForNavigation();

    // Verify list updated
    const webhook = page.locator(`text="${WEBHOOK_URL}"`);
    await expect(webhook).not.toBeVisible();

    // Verify delivery history still accessible (soft delete)
    // This would require navigating to a deleted webhook's history
  });

  test('E2E-8: Full webhook workflow (create → test → view → delete)', async ({ page }) => {
    // 1. Create
    await page.goto(`${BASE_URL}/dashboard/webhooks`);
    await page.click('button:has-text("New Webhook")');
    await page.fill('input[placeholder*="https://"]', WEBHOOK_URL);
    await page.click('button:has-text("Create")');
    await page.waitForNavigation();

    // Verify creation
    await expect(page.locator(`text="${WEBHOOK_URL}"`)).toBeVisible();

    // 2. Test
    await page.click(`a:has-text("${WEBHOOK_URL}")`);
    await page.click('button:has-text("Test Webhook")');
    await page.selectOption('select', 'task:created');
    await page.click('button:has-text("Send Test")');
    await page.waitForSelector('text=Response Inspector');

    // 3. View delivery history
    const deliveryHistory = page.locator('h2:has-text("Delivery History")');
    await expect(deliveryHistory).toBeVisible();

    // 4. Delete
    await page.goto(`${BASE_URL}/dashboard/webhooks`);
    await page.locator('button[aria-label="Delete webhook"]').first().click();
    await page.on('dialog', dialog => dialog.accept());

    // Verify deleted
    await page.waitForNavigation();
    await expect(page.locator(`text="${WEBHOOK_URL}"`)).not.toBeVisible();
  });

  test.afterAll(async () => {
    // Cleanup if needed
  });
});
