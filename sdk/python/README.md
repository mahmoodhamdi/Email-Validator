# Email Validator SDK for Python

Official Python SDK for the Email Validator API with async support.

## Installation

```bash
pip install email-validator-sdk
```

## Quick Start

### Synchronous Usage

```python
from email_validator_sdk import EmailValidator

validator = EmailValidator(
    api_key='your-api-key',  # Optional
    base_url='https://your-domain.com'  # Default: http://localhost:3000
)

# Single validation
result = validator.validate('test@example.com')
print(result.is_valid, result.score)

# With additional checks
from email_validator_sdk import ValidateOptions

result = validator.validate(
    'test@example.com',
    options=ValidateOptions(
        smtp_check=True,
        auth_check=True,
        reputation_check=True,
        gravatar_check=True
    )
)

# Bulk validation
results = validator.validate_bulk([
    'test1@example.com',
    'test2@gmail.com',
    'test3@yahoo.com'
])

print(f"Validated {results.metadata.completed} emails")

# Health check
health = validator.health()
print(health['status'])
```

### Async Usage

```python
import asyncio
from email_validator_sdk import AsyncEmailValidator

async def main():
    async with AsyncEmailValidator(api_key='your-api-key') as validator:
        # Single validation
        result = await validator.validate('test@example.com')
        print(result.is_valid, result.score)

        # Bulk validation
        results = await validator.validate_bulk([
            'email1@test.com',
            'email2@test.com'
        ])

asyncio.run(main())
```

## API Reference

### Constructor

```python
EmailValidator(
    api_key: str = None,
    base_url: str = 'http://localhost:3000',
    timeout: int = 30
)
```

### Methods

#### `validate(email: str, options: ValidateOptions = None) -> ValidationResult`

Validates a single email address.

#### `validate_bulk(emails: List[str]) -> BulkValidationResult`

Validates multiple email addresses in a single request.

#### `health() -> dict`

Checks the API health status.

## Response Types

### ValidationResult

```python
@dataclass
class ValidationResult:
    email: str
    is_valid: bool
    score: int  # 0-100
    deliverability: str  # 'deliverable' | 'risky' | 'undeliverable' | 'unknown'
    risk: str  # 'low' | 'medium' | 'high'
    checks: ValidationChecks
    timestamp: str
```

## License

MIT
