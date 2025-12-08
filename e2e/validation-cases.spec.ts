import { test, expect } from '@playwright/test';

test.describe('Email Validation Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should validate Gmail email', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('user@gmail.com');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for result
    await page.waitForSelector('[class*="badge"]', { timeout: 10000 });

    // Should show as free provider Gmail
    await expect(page.getByText(/gmail/i)).toBeVisible();

    await page.screenshot({ path: 'screenshots/validation-gmail.png', fullPage: true });
  });

  test('should detect disposable email', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('test@mailinator.com');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for result
    await page.waitForSelector('[class*="badge"]', { timeout: 10000 });

    // Should show disposable warning
    await expect(page.getByText(/disposable/i)).toBeVisible();

    await page.screenshot({ path: 'screenshots/validation-disposable.png', fullPage: true });
  });

  test('should detect role-based email', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('admin@example.com');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for result
    await page.waitForSelector('[class*="badge"]', { timeout: 10000 });

    // Should detect role-based
    await expect(page.getByText(/role/i)).toBeVisible();

    await page.screenshot({ path: 'screenshots/validation-role-based.png', fullPage: true });
  });

  test('should detect typo in domain', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('user@gmial.com');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for result
    await page.waitForSelector('[class*="badge"]', { timeout: 10000 });

    // Should show typo suggestion
    await expect(page.getByText(/did you mean/i)).toBeVisible();

    await page.screenshot({ path: 'screenshots/validation-typo.png', fullPage: true });
  });

  test('should show invalid syntax error', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('invalid-email');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for result
    await page.waitForSelector('[class*="badge"]', { timeout: 10000 });

    // Should show invalid
    await expect(page.getByText(/invalid/i)).toBeVisible();

    await page.screenshot({ path: 'screenshots/validation-invalid.png', fullPage: true });
  });

  test('should show high score for valid email', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('john.doe@gmail.com');

    const validateButton = page.getByRole('button', { name: /validate email/i });
    await validateButton.click();

    // Wait for result with score
    await page.waitForSelector('[class*="badge"]', { timeout: 10000 });

    await page.screenshot({ path: 'screenshots/validation-high-score.png', fullPage: true });
  });
});
