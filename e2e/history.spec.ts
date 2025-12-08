import { test, expect } from '@playwright/test';

test.describe('History Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history');
  });

  test('should display history heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /validation history/i })).toBeVisible();
  });

  test('should show empty state when no history', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.getByText(/no validation history/i)).toBeVisible();
  });

  test('should display history after validation', async ({ page }) => {
    // First, validate an email
    await page.goto('/');

    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('historytest@gmail.com');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for validation to complete
    await page.waitForSelector('[class*="badge"]', { timeout: 10000 });

    // Navigate to history
    await page.goto('/history');

    // Should see the validated email
    await expect(page.getByText('historytest@gmail.com')).toBeVisible();
  });

  test('should take screenshot of history page', async ({ page }) => {
    await page.screenshot({ path: 'screenshots/history-page.png', fullPage: true });
  });

  test('should take screenshot of history with items', async ({ page }) => {
    // First, validate some emails
    await page.goto('/');

    const emailInput = page.getByPlaceholder(/enter email/i);

    // Validate first email
    await emailInput.fill('test1@gmail.com');
    await page.getByRole('button', { name: /validate email/i }).click();
    await page.waitForSelector('[class*="badge"]', { timeout: 10000 });

    // Validate second email
    await emailInput.fill('test2@yahoo.com');
    await page.getByRole('button', { name: /validate email/i }).click();
    await page.waitForSelector('[class*="badge"]', { timeout: 10000 });

    // Navigate to history
    await page.goto('/history');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/history-with-items.png', fullPage: true });
  });
});
