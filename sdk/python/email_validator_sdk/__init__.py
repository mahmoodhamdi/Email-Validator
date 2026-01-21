"""
Email Validator SDK for Python
Official SDK for the Email Validator API
"""

from .client import EmailValidator
from .async_client import AsyncEmailValidator
from .types import (
    ValidationResult,
    BulkValidationResult,
    ValidateOptions,
)

__version__ = "1.0.0"
__all__ = [
    "EmailValidator",
    "AsyncEmailValidator",
    "ValidationResult",
    "BulkValidationResult",
    "ValidateOptions",
]
