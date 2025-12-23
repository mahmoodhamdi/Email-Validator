# Phase 5: Testing & Documentation

## Overview
This phase focuses on improving test coverage, adding comprehensive documentation, and ensuring production readiness.

---

## Tasks Checklist

- [ ] 5.1 Add Component Tests
- [ ] 5.2 Increase Coverage Threshold
- [ ] 5.3 Add Edge Case Tests
- [ ] 5.4 Add E2E Error State Tests
- [ ] 5.5 Add Accessibility Tests
- [ ] 5.6 Create API Documentation
- [ ] 5.7 Add Inline Code Documentation
- [ ] 5.8 Create Developer Guide

---

## 5.1 Add Component Tests

### Description
Add comprehensive tests for all React components using React Testing Library.

### Files to Create
- `src/__tests__/components/EmailValidator.test.tsx`
- `src/__tests__/components/ValidationResult.test.tsx`
- `src/__tests__/components/BulkValidator.test.tsx`
- `src/__tests__/components/ScoreIndicator.test.tsx`
- `src/__tests__/components/ValidationHistory.test.tsx`
- `src/__tests__/components/Header.test.tsx`
- `src/__tests__/components/ThemeToggle.test.tsx`

### Implementation Details
```typescript
// src/__tests__/components/EmailValidator.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailValidator } from '@/components/email/EmailValidator';

// Mock fetch
global.fetch = jest.fn();

describe('EmailValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders email input and validate button', () => {
    render(<EmailValidator />);

    expect(screen.getByPlaceholderText(/enter email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /validate/i })).toBeInTheDocument();
  });

  test('shows validation error for invalid email format', async () => {
    render(<EmailValidator />);
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/enter email/i);
    await user.type(input, 'invalid-email');

    const button = screen.getByRole('button', { name: /validate/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  test('submits valid email and shows result', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        email: 'test@example.com',
        isValid: true,
        score: 85,
        // ... full mock response
      }),
    });

    render(<EmailValidator />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/enter email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  test('shows loading state during validation', async () => {
    (fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<EmailValidator />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/enter email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /validate/i }));

    expect(screen.getByText(/validating/i)).toBeInTheDocument();
  });

  test('disables button when input is empty', () => {
    render(<EmailValidator />);

    const button = screen.getByRole('button', { name: /validate/i });
    expect(button).toBeDisabled();
  });
});
```

### ValidationResult Tests
```typescript
// src/__tests__/components/ValidationResult.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationResult } from '@/components/email/ValidationResult';

const mockResult = {
  email: 'test@example.com',
  isValid: true,
  score: 85,
  deliverability: 'deliverable' as const,
  risk: 'low' as const,
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
  timestamp: new Date().toISOString(),
};

describe('ValidationResult', () => {
  test('displays email and score', () => {
    render(<ValidationResult result={mockResult} />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  test('displays all check results', () => {
    render(<ValidationResult result={mockResult} />);

    expect(screen.getByText('Syntax')).toBeInTheDocument();
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('MX Records')).toBeInTheDocument();
  });

  test('copy button copies result to clipboard', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn() },
    });

    render(<ValidationResult result={mockResult} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /copy/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
```

---

## 5.2 Increase Coverage Threshold

### Description
Increase Jest coverage thresholds to ensure better test coverage.

### Files to Modify
- `jest.config.js`

### Implementation Details
```javascript
// jest.config.js
const customJestConfig = {
  // ...existing config
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
    '!src/components/ui/**', // Exclude shadcn components
    '!src/**/*.stories.tsx',
  ],
};
```

---

## 5.3 Add Edge Case Tests

### Description
Add tests for edge cases and internationalized emails.

### Files to Modify
- `src/__tests__/validators/syntax.test.ts`
- `src/__tests__/validators/index.test.ts`

### Implementation Details
```typescript
// src/__tests__/validators/syntax.test.ts (additions)
describe('edge cases', () => {
  const edgeCaseEmails = [
    // Valid edge cases
    { email: 'test+tag@example.com', valid: true },
    { email: '"spaces in quotes"@example.com', valid: true },
    { email: 'very.long.email.address.with.many.dots@subdomain.example.com', valid: true },
    { email: 'x@x.xx', valid: true },

    // Invalid edge cases
    { email: 'test@', valid: false },
    { email: '@example.com', valid: false },
    { email: 'test@.com', valid: false },
    { email: 'test@example.', valid: false },
    { email: 'test@@example.com', valid: false },
    { email: ' test@example.com', valid: true }, // Should be trimmed
    { email: 'test@example.com ', valid: true }, // Should be trimmed
  ];

  test.each(edgeCaseEmails)('validates $email correctly', ({ email, valid }) => {
    const result = validateSyntax(email);
    expect(result.valid).toBe(valid);
  });
});

describe('internationalized emails', () => {
  // Note: Full IDN support may need additional implementation
  test('should handle punycode domains', () => {
    const result = validateSyntax('test@xn--nxasmq5b.com');
    expect(result.valid).toBe(true);
  });
});
```

---

## 5.4 Add E2E Error State Tests

### Description
Add Playwright tests for error states and network failures.

### Files to Create
- `e2e/error-states.spec.ts`

### Implementation Details
```typescript
// e2e/error-states.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Error States', () => {
  test('should handle network error gracefully', async ({ page }) => {
    // Intercept API calls and force failure
    await page.route('**/api/validate', route => {
      route.abort('failed');
    });

    await page.goto('/');

    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('test@example.com');

    const validateButton = page.getByRole('button', { name: /validate/i });
    await validateButton.click();

    // Should show error state, not crash
    await expect(page.locator('text=error')).toBeVisible({ timeout: 5000 });
  });

  test('should handle API error response', async ({ page }) => {
    await page.route('**/api/validate', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/');

    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('test@example.com');

    await page.getByRole('button', { name: /validate/i }).click();

    // Application should handle gracefully
    await expect(page).not.toHaveURL(/error/);
  });

  test('should handle slow responses', async ({ page }) => {
    await page.route('**/api/validate', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          email: 'test@example.com',
          isValid: true,
          score: 85,
          // ... full response
        }),
      });
    });

    await page.goto('/');

    const emailInput = page.getByPlaceholder(/enter email/i);
    await emailInput.fill('test@example.com');

    await page.getByRole('button', { name: /validate/i }).click();

    // Should show loading state
    await expect(page.getByText(/validating/i)).toBeVisible();
  });

  test('should validate form before submission', async ({ page }) => {
    await page.goto('/');

    const validateButton = page.getByRole('button', { name: /validate/i });

    // Button should be disabled with empty input
    await expect(validateButton).toBeDisabled();
  });
});
```

---

## 5.5 Add Accessibility Tests

### Description
Add automated accessibility tests using axe-playwright.

### Files to Create
- `e2e/accessibility.spec.ts`

### Setup
```bash
npm install -D @axe-core/playwright
```

### Implementation Details
```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('home page should have no accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('bulk page should have no accessibility violations', async ({ page }) => {
    await page.goto('/bulk');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('history page should have no accessibility violations', async ({ page }) => {
    await page.goto('/history');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('api docs page should have no accessibility violations', async ({ page }) => {
    await page.goto('/api-docs');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be navigable by keyboard', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    // Should be able to activate button with Enter
    await page.getByPlaceholder(/enter email/i).fill('test@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Form should submit
    await expect(page.getByText(/validating/i)).toBeVisible({ timeout: 1000 });
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for labeled inputs
    const emailInput = page.getByPlaceholder(/enter email/i);
    await expect(emailInput).toBeVisible();

    // Theme toggle should have accessible label
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();
  });
});
```

---

## 5.6 Create API Documentation

### Description
Create comprehensive API documentation in OpenAPI format.

### Files to Create
- `public/api-spec.json` or `public/api-spec.yaml`

### Implementation Details
```yaml
# public/api-spec.yaml
openapi: 3.0.0
info:
  title: Email Validator API
  description: API for validating email addresses
  version: 1.0.0

servers:
  - url: /api

paths:
  /validate:
    post:
      summary: Validate a single email
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
              properties:
                email:
                  type: string
                  format: email
                  maxLength: 254
      responses:
        '200':
          description: Validation result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidationResult'
        '400':
          description: Bad request
        '429':
          description: Rate limit exceeded

  /validate-bulk:
    post:
      summary: Validate multiple emails
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - emails
              properties:
                emails:
                  type: array
                  items:
                    type: string
                    format: email
                  maxItems: 1000
      responses:
        '200':
          description: Array of validation results
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ValidationResult'

  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: API is healthy

components:
  schemas:
    ValidationResult:
      type: object
      properties:
        email:
          type: string
        isValid:
          type: boolean
        score:
          type: integer
          minimum: 0
          maximum: 100
        deliverability:
          type: string
          enum: [deliverable, risky, undeliverable, unknown]
        risk:
          type: string
          enum: [low, medium, high]
        checks:
          $ref: '#/components/schemas/ValidationChecks'
        timestamp:
          type: string
          format: date-time

    ValidationChecks:
      type: object
      properties:
        syntax:
          $ref: '#/components/schemas/SyntaxCheck'
        domain:
          $ref: '#/components/schemas/DomainCheck'
        mx:
          $ref: '#/components/schemas/MxCheck'
        disposable:
          $ref: '#/components/schemas/DisposableCheck'
        roleBased:
          $ref: '#/components/schemas/RoleBasedCheck'
        freeProvider:
          $ref: '#/components/schemas/FreeProviderCheck'
        typo:
          $ref: '#/components/schemas/TypoCheck'
        blacklisted:
          $ref: '#/components/schemas/BlacklistCheck'
        catchAll:
          $ref: '#/components/schemas/CatchAllCheck'
```

---

## 5.7 Add Inline Code Documentation

### Description
Ensure all complex logic has inline comments explaining the why.

### Guidelines
- Comment the "why", not the "what"
- Document edge cases and business logic
- Add TODO comments for known limitations

### Example
```typescript
// src/lib/validators/mx.ts

/**
 * MX record lookup is performed via Google's DNS-over-HTTPS API
 * because browser environments cannot perform direct DNS queries.
 *
 * Limitations:
 * - Depends on Google DNS availability
 * - May have rate limits
 * - Cannot verify SMTP connection
 */
export async function validateMx(domain: string): Promise<MxCheck> {
  // Check cache first to avoid redundant DNS queries
  // and respect external API rate limits
  const cached = mxCache.get(domain);
  if (cached) return cached;

  // MX type is 15 in DNS record types
  // https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml
  const mxRecords = data.Answer?.filter((record) => record.type === 15) || [];

  // Fallback to A record check because some domains
  // accept mail without explicit MX records (RFC 5321 Section 5)
  if (mxRecords.length === 0) {
    // ...
  }
}
```

---

## 5.8 Create Developer Guide

### Description
Create comprehensive documentation for developers working on the project.

### Files to Create
- `docs/DEVELOPMENT.md`
- `docs/ARCHITECTURE.md`
- `docs/API.md`

### Development Guide Content
```markdown
# Development Guide

## Prerequisites
- Node.js 20+
- npm 10+

## Setup
1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env.local`
4. Run `npm run dev`

## Project Structure
[Directory explanation]

## Running Tests
[Commands and patterns]

## Adding New Validators
[Step-by-step guide]

## Deployment
[Deployment instructions]
```

---

## Prompt for Claude Code

```
Execute Phase 5: Testing & Documentation for the Email Validator project.

Context:
- Phases 1-4 should be completed first
- Current test coverage threshold is 40%
- Component tests are missing
- E2E tests don't cover error states

Tasks to complete in order:

1. Create component tests:
   - src/__tests__/components/EmailValidator.test.tsx
   - src/__tests__/components/ValidationResult.test.tsx
   - src/__tests__/components/BulkValidator.test.tsx
   - src/__tests__/components/ScoreIndicator.test.tsx
   - src/__tests__/components/ValidationHistory.test.tsx

2. Add edge case tests to existing validator tests:
   - Update src/__tests__/validators/syntax.test.ts
   - Add internationalized email tests

3. Create E2E error state tests:
   - e2e/error-states.spec.ts
   - Test network failures
   - Test API errors
   - Test slow responses

4. Install @axe-core/playwright and create:
   - e2e/accessibility.spec.ts
   - Test all pages for a11y violations

5. Update jest.config.js:
   - Increase coverage threshold to 70%
   - Update collectCoverageFrom

6. Create public/api-spec.yaml:
   - Full OpenAPI 3.0 specification
   - Document all endpoints and schemas

7. Add inline documentation:
   - Review all validators and add "why" comments
   - Document limitations and edge cases

8. Create documentation:
   - docs/DEVELOPMENT.md
   - docs/ARCHITECTURE.md (high-level overview)

9. Run all tests:
   - npm test --coverage
   - npm run test:e2e

10. Fix any failing tests and ensure coverage threshold is met

Maintain all existing tests while adding new ones.
```

---

## Verification Checklist

After completing this phase:
- [ ] `npm test --coverage` shows 70%+ coverage
- [ ] All component tests pass
- [ ] E2E error state tests pass
- [ ] Accessibility tests pass
- [ ] OpenAPI spec validates
- [ ] Documentation is complete
- [ ] `npm run test:e2e` passes
- [ ] No accessibility violations on any page
