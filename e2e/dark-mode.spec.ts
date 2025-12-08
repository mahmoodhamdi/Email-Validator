import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
  test('should take screenshot of home page in dark mode', async ({ page }) => {
    await page.goto('/');

    // Toggle dark mode
    const themeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await themeButton.click();

    // Wait for dark mode
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.screenshot({ path: 'screenshots/home-dark-mode.png', fullPage: true });
  });

  test('should take screenshot of bulk page in dark mode', async ({ page }) => {
    await page.goto('/bulk');

    // Toggle dark mode
    const themeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await themeButton.click();

    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.screenshot({ path: 'screenshots/bulk-dark-mode.png', fullPage: true });
  });

  test('should take screenshot of API docs in dark mode', async ({ page }) => {
    await page.goto('/api-docs');

    // Toggle dark mode
    const themeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await themeButton.click();

    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.screenshot({ path: 'screenshots/api-docs-dark-mode.png', fullPage: true });
  });

  test('should take screenshot of validation result in dark mode', async ({ page }) => {
    await page.goto('/');

    // Toggle dark mode
    const themeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await themeButton.click();

    // Validate email
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('test@gmail.com');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for result
    await page.waitForSelector('[class*="badge"]', { timeout: 10000 });

    await page.screenshot({ path: 'screenshots/validation-result-dark-mode.png', fullPage: true });
  });
});
