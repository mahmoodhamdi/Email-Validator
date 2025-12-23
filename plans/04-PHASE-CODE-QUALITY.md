# Phase 4: Code Quality & Refactoring

## Overview
This phase focuses on improving code quality, removing technical debt, and enhancing maintainability.

---

## Tasks Checklist

- [ ] 4.1 Remove Duplicate Code
- [ ] 4.2 Remove Unused Code
- [ ] 4.3 Standardize Error Handling
- [ ] 4.4 Extract Magic Numbers to Constants
- [ ] 4.5 Consolidate State Management
- [ ] 4.6 Add JSDoc Documentation
- [ ] 4.7 Improve Type Safety
- [ ] 4.8 Add Code Quality Checks

---

## 4.1 Remove Duplicate Code

### Description
Remove duplicate regex definitions and consolidate shared logic.

### Files to Modify
- `src/lib/validators/syntax.ts`
- `src/lib/validators/domain.ts`
- Create: `src/lib/validators/patterns.ts`

### Implementation Details
```typescript
// src/lib/validators/patterns.ts

// Domain validation regex - single source of truth
export const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// Email regex components
export const LOCAL_PART_REGEX = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/;

// RFC 5322 compliant email regex
export const EMAIL_REGEX = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;

// Simple email regex for basic validation
export const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

### Update validators to use shared patterns
```typescript
// src/lib/validators/syntax.ts
import { EMAIL_REGEX, SIMPLE_EMAIL_REGEX } from './patterns';

// src/lib/validators/domain.ts
import { DOMAIN_REGEX } from './patterns';
```

---

## 4.2 Remove Unused Code

### Description
Remove unused exports and dead code.

### Files to Modify
- `src/lib/validators/domain.ts` - remove `isValidDomainFormat` if unused
- `src/stores/validation-store.ts` - evaluate if needed

### Implementation Details
```typescript
// Check if isValidDomainFormat is used anywhere
// If not, remove the export

// validation-store.ts is not used by EmailValidator
// Option 1: Remove it
// Option 2: Refactor EmailValidator to use it
```

### Decision: Refactor to Use Validation Store
```typescript
// src/components/email/EmailValidator.tsx
import { useValidationStore } from '@/stores/validation-store';

export function EmailValidator() {
  const {
    currentResult: result,
    isValidating: isLoading,
    setResult,
    setIsValidating,
    reset,
  } = useValidationStore();

  // Replace local state with store
}
```

---

## 4.3 Standardize Error Handling

### Description
Create consistent error handling patterns across all validators and API routes.

### Files to Create/Modify
- Create: `src/lib/errors.ts`
- Modify: All validator files
- Modify: API routes

### Implementation Details
```typescript
// src/lib/errors.ts

export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends Error {
  constructor(
    public retryAfter: number
  ) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

// Standard error response format
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export function createErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return { error: error.message };
  }

  return { error: 'An unexpected error occurred' };
}
```

### Update API routes
```typescript
// src/app/api/validate/route.ts
import { createErrorResponse, ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // ... validation logic
  } catch (error) {
    console.error('Validation error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(createErrorResponse(error), { status: 400 });
    }

    return NextResponse.json(createErrorResponse(error), { status: 500 });
  }
}
```

---

## 4.4 Extract Magic Numbers to Constants

### Description
Move all magic numbers to the constants file.

### Files to Modify
- `src/lib/constants.ts`
- `src/lib/validators/syntax.ts`
- Other files with magic numbers

### Implementation Details
```typescript
// src/lib/constants.ts (additions)

export const EMAIL_LIMITS = {
  maxLength: 254,
  localPartMaxLength: 64,
  domainMaxLength: 255,
  minTldLength: 2,
};

export const HISTORY_LIMITS = {
  maxItems: 100,
};

export const DEBOUNCE_DELAYS = {
  emailInput: 500,
  search: 300,
};

export const API_TIMEOUTS = {
  validation: 10000,
  bulkValidation: 30000,
};
```

### Update validators
```typescript
// src/lib/validators/syntax.ts
import { EMAIL_LIMITS } from '@/lib/constants';

// Replace hardcoded values:
// 254 -> EMAIL_LIMITS.maxLength
// 64 -> EMAIL_LIMITS.localPartMaxLength
// 255 -> EMAIL_LIMITS.domainMaxLength
```

---

## 4.5 Consolidate State Management

### Description
Ensure consistent use of Zustand stores vs local state.

### Files to Modify
- `src/components/email/EmailValidator.tsx`
- `src/stores/validation-store.ts`

### Implementation Details
The EmailValidator component uses local useState but a validation store exists.
Choose one approach:

**Option A: Use Store (Recommended for consistency)**
```typescript
// EmailValidator.tsx
import { useValidationStore } from '@/stores/validation-store';

export function EmailValidator() {
  const {
    currentEmail,
    currentResult,
    isValidating,
    error,
    setEmail,
    setResult,
    setIsValidating,
    setError,
    reset,
  } = useValidationStore();

  // Use store state instead of local state
}
```

**Option B: Remove Unused Store**
If local state is preferred, remove validation-store.ts to avoid confusion.

---

## 4.6 Add JSDoc Documentation

### Description
Add JSDoc comments to public functions and complex logic.

### Files to Modify
- All files in `src/lib/validators/`
- All files in `src/lib/`
- All hooks

### Implementation Details
```typescript
// src/lib/validators/syntax.ts

/**
 * Validates email syntax according to RFC 5322.
 *
 * @param email - The email address to validate
 * @returns SyntaxCheck result with valid boolean and message
 *
 * @example
 * ```typescript
 * const result = validateSyntax('test@example.com');
 * // { valid: true, message: 'Email syntax is valid' }
 * ```
 */
export function validateSyntax(email: string): SyntaxCheck {
  // ...
}

/**
 * Parses an email address into its local part and domain.
 *
 * @param email - The email address to parse
 * @returns Object with localPart and domain, or null if invalid
 */
export function parseEmail(email: string): { localPart: string; domain: string } | null {
  // ...
}
```

---

## 4.7 Improve Type Safety

### Description
Add stricter TypeScript types and eliminate any types.

### Files to Modify
- Review all files for loose typing
- Add branded types where appropriate

### Implementation Details
```typescript
// src/types/email.ts (additions)

// Branded type for validated email
export type ValidatedEmail = string & { readonly __brand: 'ValidatedEmail' };

// Strict score type
export type Score = number & { readonly __brand: 'Score' };

// Create validated email
export function createValidatedEmail(email: string): ValidatedEmail | null {
  // ... validation
  return email as ValidatedEmail;
}

// Helper to create score within range
export function createScore(value: number): Score {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return clamped as Score;
}
```

---

## 4.8 Add Code Quality Checks

### Description
Add additional linting rules and code quality tools.

### Files to Create/Modify
- `.eslintrc.json`
- Create: `.prettierrc`
- Update: `package.json`

### Implementation Details
```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}

// .eslintrc.json (additions)
{
  "rules": {
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### Add scripts
```json
// package.json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx}\"",
    "lint:strict": "eslint --max-warnings 0 src/"
  }
}
```

---

## Prompt for Claude Code

```
Execute Phase 4: Code Quality & Refactoring for the Email Validator project.

Context:
- Phases 1-3 should be completed first
- There is duplicate regex in syntax.ts and domain.ts
- validation-store.ts exists but EmailValidator uses local state
- Magic numbers exist in several files

Tasks to complete in order:

1. Create src/lib/validators/patterns.ts:
   - Move all regex patterns here
   - Export DOMAIN_REGEX, EMAIL_REGEX, SIMPLE_EMAIL_REGEX

2. Update src/lib/validators/syntax.ts:
   - Import patterns from patterns.ts
   - Remove duplicate regex definitions

3. Update src/lib/validators/domain.ts:
   - Import DOMAIN_REGEX from patterns.ts
   - Remove isValidDomainFormat if unused (check with grep first)

4. Create src/lib/errors.ts:
   - Define ValidationError class
   - Define RateLimitError class
   - Define createErrorResponse function

5. Update all API routes to use error handling from errors.ts

6. Update src/lib/constants.ts:
   - Add EMAIL_LIMITS
   - Add HISTORY_LIMITS
   - Add DEBOUNCE_DELAYS
   - Add API_TIMEOUTS

7. Update validators to use constants instead of magic numbers

8. Refactor EmailValidator.tsx to use useValidationStore:
   - Remove local state
   - Use store actions
   - Keep same UI behavior

9. Add JSDoc comments to all functions in:
   - src/lib/validators/*.ts
   - src/lib/*.ts
   - src/hooks/*.ts

10. Create .prettierrc with standard settings

11. Update .eslintrc.json with stricter rules

12. Add format and lint:strict scripts to package.json

13. Run npm run lint and fix any issues
14. Run npm run format
15. Run npm test to verify nothing broke

Focus on maintaining existing behavior while improving code quality.
```

---

## Verification Checklist

After completing this phase:
- [ ] `npm run lint` passes with no warnings
- [ ] `npm run format:check` passes
- [ ] `npm run build` completes without errors
- [ ] `npm test` passes
- [ ] No duplicate regex patterns
- [ ] All magic numbers replaced with constants
- [ ] JSDoc comments on all public functions
- [ ] Validation store is actively used
