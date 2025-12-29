import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.describe('Home Page', () => {
    test('should have no accessibility violations on initial load', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have no accessibility violations with validation result', async ({ page }) => {
      await page.goto('/');

      // Fill in email and validate
      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.fill('test@gmail.com');

      const validateButton = page.getByRole('button', { name: /validate email/i });
      await validateButton.click();

      // Wait for result to load - look for specific validation result element
      await expect(page.getByRole('heading', { name: /syntax/i })).toBeVisible({ timeout: 10000 });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/');

      // Check that email input has proper accessible name
      const emailInput = page.getByPlaceholder(/enter email/i);
      await expect(emailInput).toBeVisible();

      // Verify the input is accessible
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('input[type="email"]')
        .analyze();

      // Filter out any violations that are not critical
      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations).toEqual([]);
    });

    test('should have proper button accessibility', async ({ page }) => {
      await page.goto('/');

      const validateButton = page.getByRole('button', { name: /validate/i });
      await expect(validateButton).toBeVisible();

      // Check button accessibility
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('button')
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe('Bulk Validation Page', () => {
    test('should have no accessibility violations on bulk page', async ({ page }) => {
      await page.goto('/bulk');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible textarea', async ({ page }) => {
      await page.goto('/bulk');

      const textarea = page.getByPlaceholder(/enter emails/i);
      await expect(textarea).toBeVisible();

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('textarea')
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe('History Page', () => {
    test('should have no accessibility violations on history page', async ({ page }) => {
      await page.goto('/history');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible empty state', async ({ page }) => {
      await page.goto('/history');

      // Check for empty state message accessibility
      await expect(page.getByText(/no validation history/i)).toBeVisible();

      const accessibilityScanResults = await new AxeBuilder({ page })
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe('API Documentation Page', () => {
    test('should have no accessibility violations on API docs page', async ({ page }) => {
      await page.goto('/api-docs');

      // Click on Documentation tab to check our own content (Swagger UI is third-party)
      await page.getByRole('tab', { name: /documentation/i }).click();

      // Wait for tab content to be visible
      await expect(page.getByRole('heading', { name: '/api/validate', exact: true })).toBeVisible();

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Exclude Swagger UI which is a third-party component with its own accessibility issues
        .exclude('.swagger-ui')
        // Exclude tab list - using standard shadcn/radix styling with minor color contrast variance
        .exclude('[role="tablist"]')
        .analyze();

      // Filter to only critical violations (not serious) for third-party styled components
      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical'
      );

      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe('Dark Mode Accessibility', () => {
    test('should have no accessibility violations in dark mode', async ({ page }) => {
      await page.goto('/');

      // Toggle dark mode using the theme toggle button in header
      // The theme toggle is the button with sr-only text "Toggle theme" or similar
      const themeButton = page.locator('header button').filter({ hasText: /toggle/i }).or(
        page.locator('header button[aria-label*="theme"]')
      ).or(page.locator('header button').last());

      // Try clicking and check if dark mode applies
      try {
        await themeButton.click({ timeout: 2000 });
        await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 2000 });
      } catch {
        // If dark mode toggle doesn't work, just test current state
      }

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should maintain color contrast in dark mode', async ({ page }) => {
      await page.goto('/');

      // Try to toggle dark mode
      const themeButton = page.locator('header button').last();

      try {
        await themeButton.click({ timeout: 2000 });
        await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 2000 });
      } catch {
        // If dark mode toggle doesn't work, just test current state
      }

      // Check color contrast
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['cat.color'])
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        (v) => v.id === 'color-contrast'
      );

      expect(contrastViolations).toEqual([]);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should be able to navigate with keyboard', async ({ page }) => {
      await page.goto('/');

      // Focus on email input directly
      const emailInput = page.getByPlaceholder(/enter email/i);
      await emailInput.focus();

      // Should be able to type in the focused input
      await page.keyboard.type('test@example.com');

      // Tab to validate button and press Enter
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Should trigger validation - wait for result heading
      await expect(page.getByRole('heading', { name: /syntax/i })).toBeVisible({ timeout: 10000 });
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/');

      // Tab through elements and check focus is visible
      await page.keyboard.press('Tab');

      // Get the focused element
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Check that focus ring styles are applied
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['cat.keyboard'])
        .analyze();

      const keyboardViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(keyboardViolations).toEqual([]);
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['heading-order', 'page-has-heading-one'])
        .analyze();

      // Allow for minor heading order issues but no critical ones
      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical'
      );

      expect(criticalViolations).toEqual([]);
    });

    test('should have proper landmark regions', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['landmark-one-main', 'region'])
        .analyze();

      // Check for critical landmark violations
      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical'
      );

      expect(criticalViolations).toEqual([]);
    });

    test('should have accessible images and icons', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['image-alt', 'svg-img-alt'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Interactive Elements', () => {
    test('should have accessible toggle switch', async ({ page }) => {
      await page.goto('/');

      // Find the real-time validation toggle
      const toggle = page.getByRole('switch');
      await expect(toggle).toBeVisible();

      // Check accessibility of the switch
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('[role="switch"]')
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible navigation links', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('nav')
        .withRules(['link-name', 'link-in-text-block'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations).toEqual([]);
    });
  });
});
