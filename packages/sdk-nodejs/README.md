# @email-validator/sdk

Official Node.js SDK for the Email Validator API.

## Installation

```bash
npm install @email-validator/sdk
```

## Quick Start

```typescript
import { EmailValidator } from '@email-validator/sdk';

const validator = new EmailValidator({
  baseUrl: 'https://your-api.com',
  apiKey: 'your-api-key', // Optional
});

// Validate single email
const result = await validator.validate('test@example.com');
console.log(result.valid); // true/false
console.log(result.score); // 0-100

// Validate with options
const resultWithOptions = await validator.validate('test@example.com', {
  smtpCheck: true,
  reputationCheck: true,
});

// Bulk validation
const bulkResult = await validator.validateBulk([
  'email1@example.com',
  'email2@example.com',
]);
console.log(bulkResult.summary.valid);

// Health check
const health = await validator.healthCheck();
console.log(health.status);
```

## Configuration

```typescript
const validator = new EmailValidator({
  baseUrl: 'https://your-api.com', // Required
  apiKey: 'your-api-key',          // Optional
  timeout: 30000,                   // Request timeout (ms)
  maxRetries: 3,                    // Retry attempts
  retryDelay: 1000,                 // Initial retry delay (ms)
});
```

## API Reference

### `validate(email, options?)`

Validates a single email address.

**Parameters:**
- `email` (string): Email address to validate
- `options` (object, optional):
  - `smtpCheck` (boolean): Enable SMTP verification
  - `authCheck` (boolean): Enable authentication checks
  - `reputationCheck` (boolean): Enable reputation check
  - `gravatarCheck` (boolean): Enable Gravatar check

**Returns:** `Promise<ValidationResult>`

### `validateBulk(emails, options?)`

Validates multiple email addresses (max 1000).

**Parameters:**
- `emails` (string[]): Array of email addresses
- `options` (object, optional): Same as validate()

**Returns:** `Promise<BulkValidationResult>`

### `healthCheck()`

Checks API health status.

**Returns:** `Promise<HealthCheckResult>`

## Error Handling

```typescript
import {
  EmailValidator,
  ValidationError,
  RateLimitError,
  NetworkError
} from '@email-validator/sdk';

try {
  await validator.validate('test@example.com');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Invalid input:', error.message);
  } else if (error instanceof RateLimitError) {
    console.log('Rate limited. Retry after:', error.retryAfter);
  } else if (error instanceof NetworkError) {
    console.log('Network error:', error.message);
  }
}
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  ValidationResult,
  ValidationOptions,
  BulkValidationResult
} from '@email-validator/sdk';
```

## License

MIT
