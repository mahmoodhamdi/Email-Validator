"""
Synchronous Email Validator client
"""

import requests
from typing import Optional, List, Dict, Any

from .types import ValidationResult, BulkValidationResult, ValidateOptions


class EmailValidator:
    """
    Synchronous client for Email Validator API.

    Usage:
        validator = EmailValidator(
            api_key='your-api-key',
            base_url='https://your-domain.com'
        )

        # Single validation
        result = validator.validate('test@example.com')
        print(result.is_valid, result.score)

        # Bulk validation
        results = validator.validate_bulk(['email1@test.com', 'email2@test.com'])
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "http://localhost:3000",
        timeout: int = 30,
    ):
        """
        Initialize the Email Validator client.

        Args:
            api_key: API key for authentication (optional)
            base_url: Base URL of the API
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()

        if api_key:
            self.session.headers["Authorization"] = f"Bearer {api_key}"

        self.session.headers["Content-Type"] = "application/json"

    def validate(
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

        response = self._request("POST", "/api/validate", json=payload)
        return ValidationResult.from_dict(response)

    def validate_bulk(self, emails: List[str]) -> BulkValidationResult:
        """
        Validate multiple email addresses.

        Args:
            emails: List of email addresses to validate

        Returns:
            BulkValidationResult with all validation results
        """
        payload = {"emails": emails}
        response = self._request("POST", "/api/validate-bulk", json=payload)
        return BulkValidationResult.from_dict(response)

    def health(self) -> Dict[str, Any]:
        """
        Check API health status.

        Returns:
            Health status information
        """
        return self._request("GET", "/api/health")

    def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """Make HTTP request to API."""
        url = f"{self.base_url}{endpoint}"

        response = self.session.request(
            method,
            url,
            timeout=self.timeout,
            **kwargs,
        )

        if not response.ok:
            try:
                error = response.json()
                message = error.get("error", f"HTTP {response.status_code}")
            except Exception:
                message = f"HTTP {response.status_code}"
            raise Exception(f"API Error: {message}")

        return response.json()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.session.close()
