import { test, expect } from '@playwright/test';

test.describe('API Docs Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api-docs');
  });

  test('should display API documentation heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /api documentation/i })).toBeVisible();
  });

  test('should display tab navigation', async ({ page }) => {
    // Check that both tabs are visible
    await expect(page.getByRole('tab', { name: /interactive/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /documentation/i })).toBeVisible();
  });

  test('should display validate endpoint in documentation tab', async ({ page }) => {
    // Click on Documentation tab to see static docs
    await page.getByRole('tab', { name: /documentation/i }).click();
    await expect(page.getByRole('heading', { name: '/api/validate', exact: true })).toBeVisible();
  });

  test('should display bulk validate endpoint in documentation tab', async ({ page }) => {
    // Click on Documentation tab to see static docs
    await page.getByRole('tab', { name: /documentation/i }).click();
    await expect(page.getByRole('heading', { name: '/api/validate-bulk' })).toBeVisible();
  });

  test('should display health endpoint in documentation tab', async ({ page }) => {
    // Click on Documentation tab to see static docs
    await page.getByRole('tab', { name: /documentation/i }).click();
    await expect(page.getByRole('heading', { name: '/api/health' })).toBeVisible();
  });

  test('should display request examples in documentation tab', async ({ page }) => {
    // Click on Documentation tab to see static docs
    await page.getByRole('tab', { name: /documentation/i }).click();
    await expect(page.getByText(/request body/i).first()).toBeVisible();
  });

  test('should display response examples in documentation tab', async ({ page }) => {
    // Click on Documentation tab to see static docs
    await page.getByRole('tab', { name: /documentation/i }).click();
    await expect(page.getByText(/response/i).first()).toBeVisible();
  });

  test('should display Swagger UI in interactive tab', async ({ page }) => {
    // The interactive tab is default, check for Swagger UI elements
    await expect(page.locator('.swagger-ui')).toBeVisible({ timeout: 10000 });
  });

  test('should take screenshot of API docs page', async ({ page }) => {
    await page.screenshot({ path: 'screenshots/api-docs-page.png', fullPage: true });
  });
});
