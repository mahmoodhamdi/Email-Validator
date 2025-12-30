"""Synchronous client for Email Validator API."""

from typing import List, Optional, Dict, Any

import requests
from requests.exceptions import RequestException, Timeout

from .types import (
    ValidationResult,
    BulkValidationResult,
    HealthCheckResult,
    ValidationOptions,
)
from .exceptions import (
    EmailValidatorError,
    ValidationError,
    AuthenticationError,
    RateLimitError,
    NetworkError,
    SDKTimeoutError,
)
from .utils import get_backoff_delay, is_retryable_status, is_valid_email_format, sleep


class EmailValidator:
    """Synchronous client for Email Validator API."""

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ):
        """
        Initialize Email Validator client.

        Args:
            base_url: Base URL of the Email Validator API
            api_key: Optional API key for authentication
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts
            retry_delay: Initial retry delay in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._session = requests.Session()
        self._session.headers.update(
            {
                "Content-Type": "application/json",
                "User-Agent": "EmailValidator-Python-SDK/1.0.0",
            }
        )
        if api_key:
            self._session.headers["X-API-Key"] = api_key

    def validate(
        self,
        email: str,
        options: Optional[ValidationOptions] = None,
    ) -> ValidationResult:
        """
        Validate a single email address.

        Args:
            email: Email address to validate
            options: Optional validation options

        Returns:
            ValidationResult with validation details

        Raises:
            ValidationError: If email is invalid
            AuthenticationError: If API key is invalid
            RateLimitError: If rate limit is exceeded
            NetworkError: If network error occurs
            SDKTimeoutError: If request times out
        """
        if not email or not isinstance(email, str):
            raise ValidationError("Email is required")

        if not is_valid_email_format(email):
            raise ValidationError("Invalid email format")

        payload: Dict[str, Any] = {"email": email}
        if options:
            payload.update(options.to_dict())

        response = self._request("POST", "/api/validate", json=payload)
        return ValidationResult.from_dict(response)

    def validate_bulk(
        self,
        emails: List[str],
        options: Optional[ValidationOptions] = None,
    ) -> BulkValidationResult:
        """
        Validate multiple email addresses.

        Args:
            emails: List of email addresses (max 1000)
            options: Optional validation options

        Returns:
            BulkValidationResult with all results

        Raises:
            ValidationError: If input is invalid
        """
        if not emails or not isinstance(emails, list):
            raise ValidationError("Emails list is required")

        if len(emails) == 0:
            raise ValidationError("Emails list cannot be empty")

        if len(emails) > 1000:
            raise ValidationError("Maximum 1000 emails per request")

        payload: Dict[str, Any] = {"emails": emails}
        if options:
            payload.update(options.to_dict())

        response = self._request("POST", "/api/validate-bulk", json=payload)
        return BulkValidationResult.from_dict(response)

    def health_check(self) -> HealthCheckResult:
        """
        Check API health status.

        Returns:
            HealthCheckResult with status details
        """
        response = self._request("GET", "/api/health")
        return HealthCheckResult(
            status=response["status"],
            version=response["version"],
            uptime=response["uptime"],
            timestamp=response["timestamp"],
        )

    def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Make HTTP request with retry logic."""
        url = f"{self.base_url}{endpoint}"
        last_error: Optional[Exception] = None

        for attempt in range(self.max_retries + 1):
            try:
                response = self._session.request(
                    method,
                    url,
                    timeout=self.timeout,
                    **kwargs,
                )

                if response.ok:
                    return response.json()

                # Handle specific error codes
                if response.status_code == 401:
                    raise AuthenticationError()

                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    raise RateLimitError(
                        retry_after=int(retry_after) if retry_after else None
                    )

                # Parse error response
                try:
                    error_data = response.json()
                except Exception:
                    error_data = response.text

                if not is_retryable_status(response.status_code):
                    raise EmailValidatorError(
                        f"API error: {response.status_code}",
                        "API_ERROR",
                        response.status_code,
                        error_data,
                    )

                last_error = EmailValidatorError(
                    f"API error: {response.status_code}",
                    "API_ERROR",
                    response.status_code,
                    error_data,
                )

            except Timeout:
                last_error = SDKTimeoutError(self.timeout)
            except RequestException as e:
                last_error = NetworkError(str(e), e)
            except (AuthenticationError, RateLimitError):
                raise

            # Wait before retry (except on last attempt)
            if attempt < self.max_retries:
                delay = get_backoff_delay(attempt, self.retry_delay)
                sleep(delay)

        raise last_error or NetworkError("Request failed after retries")

    def close(self) -> None:
        """Close the HTTP session."""
        self._session.close()

    def __enter__(self) -> "EmailValidator":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
