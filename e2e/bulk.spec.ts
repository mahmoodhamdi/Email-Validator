import { test, expect } from '@playwright/test';

test.describe('Bulk Validation Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bulk');
  });

  test('should display bulk validation heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /bulk email validation/i })).toBeVisible();
  });

  test('should have textarea for email input', async ({ page }) => {
    const textarea = page.getByPlaceholder(/enter emails/i);
    await expect(textarea).toBeVisible();
  });

  test('should have upload file button', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /upload file/i });
    await expect(uploadButton).toBeVisible();
  });

  test('should show email count', async ({ page }) => {
    const textarea = page.getByPlaceholder(/enter emails/i);
    await textarea.fill('test1@gmail.com\ntest2@yahoo.com\ntest3@outlook.com');

    await expect(page.getByText(/3 emails? detected/i)).toBeVisible();
  });

  test('should validate multiple emails', async ({ page }) => {
    const textarea = page.getByPlaceholder(/enter emails/i);
    await textarea.fill('test1@gmail.com\ntest2@yahoo.com');

    const validateButton = page.getByRole('button', { name: /validate all/i });
    await validateButton.click();

    // Wait for results
    await expect(page.getByText(/results/i)).toBeVisible({ timeout: 15000 });
  });

  test('should clear textarea', async ({ page }) => {
    const textarea = page.getByPlaceholder(/enter emails/i);
    await textarea.fill('test@example.com');

    const clearButton = page.getByRole('button', { name: /clear/i });
    await clearButton.click();

    await expect(textarea).toHaveValue('');
  });

  test('should have export buttons after validation', async ({ page }) => {
    const textarea = page.getByPlaceholder(/enter emails/i);
    await textarea.fill('test@gmail.com');

    const validateButton = page.getByRole('button', { name: /validate all/i });
    await validateButton.click();

    // Wait for results and export buttons
    await expect(page.getByRole('button', { name: /csv/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /json/i })).toBeVisible();
  });

  test('should take screenshot of bulk page', async ({ page }) => {
    await page.screenshot({ path: 'screenshots/bulk-page.png', fullPage: true });
  });

  test('should take screenshot after bulk validation', async ({ page }) => {
    const textarea = page.getByPlaceholder(/enter emails/i);
    await textarea.fill('valid@gmail.com\ninvalid-email\ntest@mailinator.com');

    const validateButton = page.getByRole('button', { name: /validate all/i });
    await validateButton.click();

    // Wait for results
    await page.waitForSelector('[class*="badge"]', { timeout: 15000 });

    await page.screenshot({ path: 'screenshots/bulk-results.png', fullPage: true });
  });
});
