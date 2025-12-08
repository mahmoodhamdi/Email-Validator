import { test, expect } from '@playwright/test';

test.describe('API Docs Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api-docs');
  });

  test('should display API documentation heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /api documentation/i })).toBeVisible();
  });

  test('should display validate endpoint', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '/api/validate', exact: true })).toBeVisible();
  });

  test('should display bulk validate endpoint', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '/api/validate-bulk' })).toBeVisible();
  });

  test('should display health endpoint', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '/api/health' })).toBeVisible();
  });

  test('should display request examples', async ({ page }) => {
    await expect(page.getByText(/request body/i).first()).toBeVisible();
  });

  test('should display response examples', async ({ page }) => {
    await expect(page.getByText(/response/i).first()).toBeVisible();
  });

  test('should take screenshot of API docs page', async ({ page }) => {
    await page.screenshot({ path: 'screenshots/api-docs-page.png', fullPage: true });
  });
});
