"""Custom exceptions for Email Validator SDK."""

from typing import Any, Optional


class EmailValidatorError(Exception):
    """Base exception for Email Validator SDK."""

    def __init__(
        self,
        message: str,
        code: str = "UNKNOWN_ERROR",
        status_code: Optional[int] = None,
        details: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class ValidationError(EmailValidatorError):
    """Raised when input validation fails."""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, "VALIDATION_ERROR", 400, details)


class AuthenticationError(EmailValidatorError):
    """Raised when API authentication fails."""

    def __init__(self, message: str = "Invalid or missing API key"):
        super().__init__(message, "AUTHENTICATION_ERROR", 401)


class RateLimitError(EmailValidatorError):
    """Raised when rate limit is exceeded."""

    def __init__(self, retry_after: Optional[int] = None):
        super().__init__("Rate limit exceeded", "RATE_LIMIT_ERROR", 429)
        self.retry_after = retry_after


class NetworkError(EmailValidatorError):
    """Raised when a network error occurs."""

    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(message, "NETWORK_ERROR")
        self.cause = cause


class SDKTimeoutError(EmailValidatorError):
    """Raised when request times out."""

    def __init__(self, timeout: float):
        super().__init__(f"Request timed out after {timeout}s", "TIMEOUT_ERROR")
        self.timeout = timeout
