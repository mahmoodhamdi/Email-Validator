import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /email validator/i })).toBeVisible();
  });

  test('should have email input field', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter email/i);
    await expect(emailInput).toBeVisible();
  });

  test('should have validate button', async ({ page }) => {
    const validateButton = page.getByRole('button', { name: /validate/i });
    await expect(validateButton).toBeVisible();
  });

  test('should display feature cards', async ({ page }) => {
    await expect(page.getByText('Syntax Check')).toBeVisible();
    await expect(page.getByText('Domain Verification')).toBeVisible();
    await expect(page.getByText('MX Records')).toBeVisible();
    await expect(page.getByText('Disposable Detection')).toBeVisible();
  });

  test('should validate a valid email', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('test@gmail.com');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for validation result
    await expect(page.getByText(/syntax/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show validation result for valid email', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('user@gmail.com');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for result and check for badges
    await expect(page.locator('[class*="badge"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to bulk page', async ({ page }) => {
    await page.getByRole('link', { name: /bulk/i }).click();
    await expect(page).toHaveURL('/bulk');
  });

  test('should navigate to history page', async ({ page }) => {
    await page.getByRole('link', { name: /history/i }).click();
    await expect(page).toHaveURL('/history');
  });

  test('should navigate to API docs page', async ({ page }) => {
    await page.getByRole('link', { name: /api/i }).click();
    await expect(page).toHaveURL('/api-docs');
  });

  test('should toggle dark mode', async ({ page }) => {
    const themeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await themeButton.click();

    // Check if dark class is applied
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should take screenshot of home page', async ({ page }) => {
    await page.screenshot({ path: 'screenshots/home-page.png', fullPage: true });
  });
});
