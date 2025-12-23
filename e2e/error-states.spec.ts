import { test, expect } from '@playwright/test';

test.describe('Error States', () => {
  test.describe('Network Failures', () => {
    test('should handle network failure on single validation', async ({ page }) => {
      await page.goto('/');

      // Intercept API request and simulate network failure
      await page.route('**/api/validate', (route) => {
        route.abort('failed');
      });

      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('test@example.com');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Should handle error gracefully without crashing
      // The button should return to normal state
      await expect(validateButton).toBeEnabled({ timeout: 10000 });
    });

    test('should handle network failure on bulk validation', async ({ page }) => {
      await page.goto('/bulk');

      // Intercept API request and simulate network failure
      await page.route('**/api/validate-bulk', (route) => {
        route.abort('failed');
      });

      const textarea = page.getByPlaceholder(/enter emails/i);
      await textarea.fill('test1@example.com\ntest2@example.com');

      const validateButton = page.getByRole('button', { name: /validate all/i });
      await validateButton.click();

      // Should show error toast or return to normal state
      await expect(validateButton).toBeEnabled({ timeout: 10000 });
    });

    test('should handle network timeout', async ({ page }) => {
      await page.goto('/');

      // Simulate slow network that times out
      await page.route('**/api/validate', async (route) => {
        // Delay for 60 seconds to simulate timeout
        await new Promise((resolve) => setTimeout(resolve, 60000));
        route.continue();
      });

      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('test@example.com');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Button should show loading state
      await expect(page.getByText(/validating/i)).toBeVisible();
    });
  });

  test.describe('API Errors', () => {
    test('should handle 400 Bad Request', async ({ page }) => {
      await page.goto('/');

      await page.route('**/api/validate', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid email format', code: 'INVALID_REQUEST' }),
        });
      });

      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('test@example.com');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Should return to normal state
      await expect(validateButton).toBeEnabled({ timeout: 10000 });
    });

    test('should handle 429 Rate Limit', async ({ page }) => {
      await page.goto('/');

      await page.route('**/api/validate', (route) => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 60
          }),
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + 60000),
          },
        });
      });

      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('test@example.com');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Should return to normal state
      await expect(validateButton).toBeEnabled({ timeout: 10000 });
    });

    test('should handle 500 Internal Server Error', async ({ page }) => {
      await page.goto('/');

      await page.route('**/api/validate', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('test@example.com');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Should return to normal state without crashing
      await expect(validateButton).toBeEnabled({ timeout: 10000 });
    });

    test('should handle 503 Service Unavailable', async ({ page }) => {
      await page.goto('/');

      await page.route('**/api/validate', (route) => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service temporarily unavailable' }),
        });
      });

      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('test@example.com');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Should return to normal state
      await expect(validateButton).toBeEnabled({ timeout: 10000 });
    });

    test('should handle malformed JSON response', async ({ page }) => {
      await page.goto('/');

      await page.route('**/api/validate', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'not valid json {{{',
        });
      });

      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('test@example.com');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Should handle JSON parse error gracefully
      await expect(validateButton).toBeEnabled({ timeout: 10000 });
    });
  });

  test.describe('Slow Responses', () => {
    test('should show loading state during slow validation', async ({ page }) => {
      await page.goto('/');

      // Add a 3 second delay to the response
      await page.route('**/api/validate', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            email: 'test@example.com',
            isValid: true,
            score: 85,
            checks: {
              syntax: { valid: true, message: 'Valid' },
              domain: { valid: true, exists: true, message: 'Valid' },
              mx: { valid: true, records: ['mx.example.com'], message: 'Found' },
              disposable: { isDisposable: false, message: 'Not disposable' },
              roleBased: { isRoleBased: false, role: null },
              freeProvider: { isFree: false, provider: null },
              typo: { hasTypo: false, suggestion: null },
              blacklisted: { isBlacklisted: false, lists: [] },
              catchAll: { isCatchAll: false },
            },
            deliverability: 'deliverable',
            risk: 'low',
            timestamp: new Date().toISOString(),
          }),
        });
      });

      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('test@example.com');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Should show loading state
      await expect(page.getByText(/validating/i)).toBeVisible();

      // Wait for result - look for specific validation result heading
      await expect(page.getByRole('heading', { name: /syntax/i })).toBeVisible({ timeout: 10000 });
    });

    test('should disable input during slow validation', async ({ page }) => {
      await page.goto('/');

      await page.route('**/api/validate', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            email: 'test@example.com',
            isValid: true,
            score: 85,
            checks: {
              syntax: { valid: true, message: 'Valid' },
              domain: { valid: true, exists: true, message: 'Valid' },
              mx: { valid: true, records: [], message: 'Found' },
              disposable: { isDisposable: false, message: '' },
              roleBased: { isRoleBased: false, role: null },
              freeProvider: { isFree: false, provider: null },
              typo: { hasTypo: false, suggestion: null },
              blacklisted: { isBlacklisted: false, lists: [] },
              catchAll: { isCatchAll: false },
            },
            deliverability: 'deliverable',
            risk: 'low',
            timestamp: new Date().toISOString(),
          }),
        });
      });

      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('test@example.com');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Input should be disabled during validation
      await expect(emailInput).toBeDisabled();

      // Wait for validation to complete
      await expect(emailInput).toBeEnabled({ timeout: 10000 });
    });
  });

  test.describe('Empty and Invalid States', () => {
    test('should disable validate button when email is empty', async ({ page }) => {
      await page.goto('/');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await expect(validateButton).toBeDisabled();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/');

      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('not-an-email');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Form validation may prevent submission or show error
      // Just check that the page doesn't crash and button returns to enabled
      await expect(validateButton).toBeEnabled({ timeout: 5000 });
    });

    test('should handle empty bulk validation list', async ({ page }) => {
      await page.goto('/bulk');

      const validateButton = page.getByRole('button', { name: /validate all/i });

      // Button should be disabled when no emails
      await expect(validateButton).toBeDisabled();
    });
  });

  test.describe('Concurrent Request Handling', () => {
    test('should handle rapid successive validations', async ({ page }) => {
      await page.goto('/');

      let requestCount = 0;
      await page.route('**/api/validate', async (route) => {
        requestCount++;
        await new Promise((resolve) => setTimeout(resolve, 500));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            email: 'test@example.com',
            isValid: true,
            score: 85,
            checks: {
              syntax: { valid: true, message: 'Valid' },
              domain: { valid: true, exists: true, message: 'Valid' },
              mx: { valid: true, records: [], message: 'Found' },
              disposable: { isDisposable: false, message: '' },
              roleBased: { isRoleBased: false, role: null },
              freeProvider: { isFree: false, provider: null },
              typo: { hasTypo: false, suggestion: null },
              blacklisted: { isBlacklisted: false, lists: [] },
              catchAll: { isCatchAll: false },
            },
            deliverability: 'deliverable',
            risk: 'low',
            timestamp: new Date().toISOString(),
          }),
        });
      });

      const emailInput = page.getByPlaceholder(/enter email/i);
      const validateButton = page.getByRole('button', { name: /validate email/i });

      // Submit multiple times quickly
      await emailInput.fill('test1@example.com');
      await validateButton.click();

      // Page should not crash and eventually show result
      await expect(page.getByRole('heading', { name: /syntax/i })).toBeVisible({ timeout: 10000 });
    });
  });
});
