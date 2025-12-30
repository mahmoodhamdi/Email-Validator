# email-validator-sdk

Official Python SDK for the Email Validator API.

## Installation

```bash
pip install email-validator-sdk
```

## Quick Start

### Synchronous Usage

```python
from email_validator_sdk import EmailValidator, ValidationOptions

# Initialize client
validator = EmailValidator(
    base_url="https://your-api.com",
    api_key="your-api-key",  # Optional
)

# Validate single email
result = validator.validate("test@example.com")
print(result.valid)  # True/False
print(result.score)  # 0-100

# Validate with options
result = validator.validate(
    "test@example.com",
    options=ValidationOptions(
        smtp_check=True,
        reputation_check=True,
    )
)

# Bulk validation
bulk_result = validator.validate_bulk([
    "email1@example.com",
    "email2@example.com",
])
print(bulk_result.summary.valid)

# Health check
health = validator.health_check()
print(health.status)

# Use as context manager
with EmailValidator(base_url="https://api.com") as validator:
    result = validator.validate("test@example.com")
```

### Asynchronous Usage

```python
import asyncio
from email_validator_sdk import AsyncEmailValidator

async def main():
    async with AsyncEmailValidator(base_url="https://your-api.com") as validator:
        result = await validator.validate("test@example.com")
        print(result.valid)

asyncio.run(main())
```

## Configuration

```python
validator = EmailValidator(
    base_url="https://your-api.com",  # Required
    api_key="your-api-key",           # Optional
    timeout=30.0,                      # Request timeout (seconds)
    max_retries=3,                     # Retry attempts
    retry_delay=1.0,                   # Initial retry delay (seconds)
)
```

## Error Handling

```python
from email_validator_sdk import (
    EmailValidator,
    ValidationError,
    RateLimitError,
    NetworkError,
)

try:
    result = validator.validate("test@example.com")
except ValidationError as e:
    print(f"Invalid input: {e.message}")
except RateLimitError as e:
    print(f"Rate limited. Retry after: {e.retry_after}")
except NetworkError as e:
    print(f"Network error: {e.message}")
```

## API Reference

### EmailValidator

Synchronous client for the Email Validator API.

#### Methods

- `validate(email, options=None)` - Validate a single email
- `validate_bulk(emails, options=None)` - Validate multiple emails (max 1000)
- `health_check()` - Check API health status
- `close()` - Close the HTTP session

### AsyncEmailValidator

Asynchronous client for the Email Validator API.

#### Methods

- `await validate(email, options=None)` - Validate a single email
- `await validate_bulk(emails, options=None)` - Validate multiple emails
- `await health_check()` - Check API health status
- `await close()` - Close the HTTP session

### ValidationOptions

```python
options = ValidationOptions(
    smtp_check=True,       # Enable SMTP verification
    auth_check=True,       # Enable authentication checks
    reputation_check=True, # Enable reputation check
    gravatar_check=True,   # Enable Gravatar check
)
```

## License

MIT
