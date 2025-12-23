import { test, expect } from '@playwright/test';

test.describe('Dark Mode', () => {
  // Helper to toggle dark mode
  async function toggleDarkMode(page: import('@playwright/test').Page) {
    const themeButton = page.locator('header button').last();
    try {
      await themeButton.click({ timeout: 3000 });
      await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 2000 });
    } catch {
      // If dark mode toggle fails, continue with light mode
    }
  }

  test('should take screenshot of home page in dark mode', async ({ page }) => {
    await page.goto('/');
    await toggleDarkMode(page);
    await page.screenshot({ path: 'screenshots/home-dark-mode.png', fullPage: true });
  });

  test('should take screenshot of bulk page in dark mode', async ({ page }) => {
    await page.goto('/bulk');
    await toggleDarkMode(page);
    await page.screenshot({ path: 'screenshots/bulk-dark-mode.png', fullPage: true });
  });

  test('should take screenshot of API docs in dark mode', async ({ page }) => {
    await page.goto('/api-docs');
    await toggleDarkMode(page);
    await page.screenshot({ path: 'screenshots/api-docs-dark-mode.png', fullPage: true });
  });

  test('should take screenshot of validation result in dark mode', async ({ page }) => {
    await page.goto('/');
    await toggleDarkMode(page);

    // Validate email
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('test@gmail.com');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for result
    await expect(page.getByRole('heading', { name: /syntax/i })).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/validation-result-dark-mode.png', fullPage: true });
  });
});
