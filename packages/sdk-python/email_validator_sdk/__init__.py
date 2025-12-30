"""Email Validator SDK for Python."""

from .client import EmailValidator
from .async_client import AsyncEmailValidator
from .types import (
    ValidationResult,
    BulkValidationResult,
    HealthCheckResult,
    ValidationOptions,
    ValidationChecks,
    Deliverability,
    RiskLevel,
)
from .exceptions import (
    EmailValidatorError,
    ValidationError,
    AuthenticationError,
    RateLimitError,
    NetworkError,
    SDKTimeoutError,
)

__version__ = "1.0.0"

__all__ = [
    # Clients
    "EmailValidator",
    "AsyncEmailValidator",
    # Types
    "ValidationResult",
    "BulkValidationResult",
    "HealthCheckResult",
    "ValidationOptions",
    "ValidationChecks",
    "Deliverability",
    "RiskLevel",
    # Exceptions
    "EmailValidatorError",
    "ValidationError",
    "AuthenticationError",
    "RateLimitError",
    "NetworkError",
    "SDKTimeoutError",
]
