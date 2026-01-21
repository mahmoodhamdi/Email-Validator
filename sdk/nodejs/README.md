# Email Validator SDK for Node.js

Official Node.js/TypeScript SDK for the Email Validator API.

## Installation

```bash
npm install @email-validator/sdk
```

## Quick Start

```typescript
import { EmailValidator } from '@email-validator/sdk';

const validator = new EmailValidator({
  apiKey: 'your-api-key', // Optional
  baseUrl: 'https://your-domain.com' // Default: http://localhost:3000
});

// Single email validation
const result = await validator.validate('test@example.com');
console.log(result.isValid, result.score);

// With additional checks
const detailedResult = await validator.validate('test@example.com', {
  smtpCheck: true,
  authCheck: true,
  reputationCheck: true,
  gravatarCheck: true
});

// Bulk validation
const bulkResults = await validator.validateBulk([
  'test1@example.com',
  'test2@gmail.com',
  'test3@yahoo.com'
]);

console.log(`Validated ${bulkResults.metadata.completed} emails`);

// Health check
const health = await validator.health();
console.log(health.status);
```

## API Reference

### Constructor

```typescript
new EmailValidator(config?: EmailValidatorConfig)
```

#### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | `''` | API key for authentication |
| `baseUrl` | `string` | `'http://localhost:3000'` | Base URL of the API |
| `timeout` | `number` | `30000` | Request timeout in ms |

### Methods

#### `validate(email: string, options?: ValidateOptions): Promise<ValidationResult>`

Validates a single email address.

#### `validateBulk(emails: string[]): Promise<BulkValidationResult>`

Validates multiple email addresses in a single request.

#### `health(): Promise<HealthResponse>`

Checks the API health status.

## Response Types

### ValidationResult

```typescript
interface ValidationResult {
  email: string;
  isValid: boolean;
  score: number; // 0-100
  deliverability: 'deliverable' | 'risky' | 'undeliverable' | 'unknown';
  risk: 'low' | 'medium' | 'high';
  checks: ValidationChecks;
  timestamp: string;
}
```

## License

MIT
