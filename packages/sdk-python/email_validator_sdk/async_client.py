"""Asynchronous client for Email Validator API."""

import asyncio
from typing import List, Optional, Dict, Any

import aiohttp

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
from .utils import get_backoff_delay, is_retryable_status, is_valid_email_format


class AsyncEmailValidator:
    """Asynchronous client for Email Validator API."""

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ):
        """
        Initialize async Email Validator client.

        Args:
            base_url: Base URL of the Email Validator API
            api_key: Optional API key for authentication
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts
            retry_delay: Initial retry delay in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self._timeout_seconds = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "EmailValidator-Python-SDK/1.0.0",
            }
            if self.api_key:
                headers["X-API-Key"] = self.api_key
            self._session = aiohttp.ClientSession(
                headers=headers,
                timeout=self.timeout,
            )
        return self._session

    async def validate(
        self,
        email: str,
        options: Optional[ValidationOptions] = None,
    ) -> ValidationResult:
        """
        Validate a single email address asynchronously.

        Args:
            email: Email address to validate
            options: Optional validation options

        Returns:
            ValidationResult with validation details
        """
        if not email or not isinstance(email, str):
            raise ValidationError("Email is required")

        if not is_valid_email_format(email):
            raise ValidationError("Invalid email format")

        payload: Dict[str, Any] = {"email": email}
        if options:
            payload.update(options.to_dict())

        response = await self._request("POST", "/api/validate", json=payload)
        return ValidationResult.from_dict(response)

    async def validate_bulk(
        self,
        emails: List[str],
        options: Optional[ValidationOptions] = None,
    ) -> BulkValidationResult:
        """
        Validate multiple email addresses asynchronously.

        Args:
            emails: List of email addresses (max 1000)
            options: Optional validation options

        Returns:
            BulkValidationResult with all results
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

        response = await self._request("POST", "/api/validate-bulk", json=payload)
        return BulkValidationResult.from_dict(response)

    async def health_check(self) -> HealthCheckResult:
        """
        Check API health status asynchronously.

        Returns:
            HealthCheckResult with status details
        """
        response = await self._request("GET", "/api/health")
        return HealthCheckResult(
            status=response["status"],
            version=response["version"],
            uptime=response["uptime"],
            timestamp=response["timestamp"],
        )

    async def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Make HTTP request with retry logic."""
        session = await self._get_session()
        url = f"{self.base_url}{endpoint}"
        last_error: Optional[Exception] = None

        for attempt in range(self.max_retries + 1):
            try:
                async with session.request(method, url, **kwargs) as response:
                    if response.ok:
                        return await response.json()

                    # Handle specific error codes
                    if response.status == 401:
                        raise AuthenticationError()

                    if response.status == 429:
                        retry_after = response.headers.get("Retry-After")
                        raise RateLimitError(
                            retry_after=int(retry_after) if retry_after else None
                        )

                    # Parse error response
                    try:
                        error_data = await response.json()
                    except Exception:
                        error_data = await response.text()

                    if not is_retryable_status(response.status):
                        raise EmailValidatorError(
                            f"API error: {response.status}",
                            "API_ERROR",
                            response.status,
                            error_data,
                        )

                    last_error = EmailValidatorError(
                        f"API error: {response.status}",
                        "API_ERROR",
                        response.status,
                        error_data,
                    )

            except asyncio.TimeoutError:
                last_error = SDKTimeoutError(self._timeout_seconds)
            except aiohttp.ClientError as e:
                last_error = NetworkError(str(e), e)
            except (AuthenticationError, RateLimitError):
                raise

            # Wait before retry (except on last attempt)
            if attempt < self.max_retries:
                delay = get_backoff_delay(attempt, self.retry_delay)
                await asyncio.sleep(delay)

        raise last_error or NetworkError("Request failed after retries")

    async def close(self) -> None:
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()

    async def __aenter__(self) -> "AsyncEmailValidator":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
