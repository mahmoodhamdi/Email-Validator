"""
Asynchronous Email Validator client
"""

import aiohttp
from typing import Optional, List, Dict, Any

from .types import ValidationResult, BulkValidationResult, ValidateOptions


class AsyncEmailValidator:
    """
    Asynchronous client for Email Validator API.

    Usage:
        async with AsyncEmailValidator(api_key='your-api-key') as validator:
            result = await validator.validate('test@example.com')
            print(result.is_valid, result.score)
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "http://localhost:3000",
        timeout: int = 30,
    ):
        """
        Initialize the async Email Validator client.

        Args:
            api_key: API key for authentication (optional)
            base_url: Base URL of the API
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        self._session = aiohttp.ClientSession(
            headers=headers,
            timeout=self.timeout,
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._session:
            await self._session.close()

    async def validate(
        self,
        email: str,
        options: Optional[ValidateOptions] = None,
    ) -> ValidationResult:
        """
        Validate a single email address.

        Args:
            email: Email address to validate
            options: Validation options

        Returns:
            ValidationResult with validation details
        """
        options = options or ValidateOptions()

        payload: Dict[str, Any] = {
            "email": email,
        }

        if options.smtp_check:
            payload["smtpCheck"] = True
        if options.auth_check:
            payload["authCheck"] = True
        if options.reputation_check:
            payload["reputationCheck"] = True
        if options.gravatar_check:
            payload["gravatarCheck"] = True

        response = await self._request("POST", "/api/validate", json=payload)
        return ValidationResult.from_dict(response)

    async def validate_bulk(self, emails: List[str]) -> BulkValidationResult:
        """
        Validate multiple email addresses.

        Args:
            emails: List of email addresses to validate

        Returns:
            BulkValidationResult with all validation results
        """
        payload = {"emails": emails}
        response = await self._request("POST", "/api/validate-bulk", json=payload)
        return BulkValidationResult.from_dict(response)

    async def health(self) -> Dict[str, Any]:
        """
        Check API health status.

        Returns:
            Health status information
        """
        return await self._request("GET", "/api/health")

    async def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """Make async HTTP request to API."""
        if not self._session:
            raise RuntimeError("Client not initialized. Use 'async with' context manager.")

        url = f"{self.base_url}{endpoint}"

        async with self._session.request(method, url, **kwargs) as response:
            if not response.ok:
                try:
                    error = await response.json()
                    message = error.get("error", f"HTTP {response.status}")
                except Exception:
                    message = f"HTTP {response.status}"
                raise Exception(f"API Error: {message}")

            return await response.json()
