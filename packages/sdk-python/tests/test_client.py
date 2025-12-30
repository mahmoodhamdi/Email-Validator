"""Tests for synchronous client."""

import pytest
import responses

from email_validator_sdk import (
    EmailValidator,
    ValidationError,
    AuthenticationError,
    RateLimitError,
)


@pytest.fixture
def validator():
    return EmailValidator(
        base_url="http://localhost:3000",
        api_key="test-key",
        max_retries=0,
    )


class TestValidate:
    @responses.activate
    def test_validate_success(self, validator):
        responses.add(
            responses.POST,
            "http://localhost:3000/api/validate",
            json={
                "email": "test@example.com",
                "valid": True,
                "score": 95,
                "deliverability": "deliverable",
                "risk": "low",
                "checks": {
                    "syntax": {"valid": True},
                    "domain": {"valid": True, "exists": True},
                    "mx": {"valid": True, "records": ["mx.example.com"]},
                    "disposable": {"isDisposable": False},
                    "roleBased": {"isRoleBased": False},
                    "freeProvider": {"isFreeProvider": False},
                },
            },
            status=200,
        )

        result = validator.validate("test@example.com")

        assert result.valid is True
        assert result.score == 95

    def test_validate_empty_email(self, validator):
        with pytest.raises(ValidationError):
            validator.validate("")

    def test_validate_none_email(self, validator):
        with pytest.raises(ValidationError):
            validator.validate(None)

    def test_validate_invalid_format(self, validator):
        with pytest.raises(ValidationError):
            validator.validate("not-an-email")

    @responses.activate
    def test_validate_unauthorized(self, validator):
        responses.add(
            responses.POST,
            "http://localhost:3000/api/validate",
            json={"error": "Unauthorized"},
            status=401,
        )

        with pytest.raises(AuthenticationError):
            validator.validate("test@example.com")

    @responses.activate
    def test_validate_rate_limited(self, validator):
        responses.add(
            responses.POST,
            "http://localhost:3000/api/validate",
            json={"error": "Rate limited"},
            status=429,
            headers={"Retry-After": "60"},
        )

        with pytest.raises(RateLimitError) as exc_info:
            validator.validate("test@example.com")

        assert exc_info.value.retry_after == 60

    @responses.activate
    def test_validate_includes_api_key(self, validator):
        responses.add(
            responses.POST,
            "http://localhost:3000/api/validate",
            json={
                "email": "test@example.com",
                "valid": True,
                "score": 95,
                "deliverability": "deliverable",
                "risk": "low",
                "checks": {
                    "syntax": {"valid": True},
                    "domain": {"valid": True, "exists": True},
                    "mx": {"valid": True, "records": []},
                    "disposable": {"isDisposable": False},
                    "roleBased": {"isRoleBased": False},
                    "freeProvider": {"isFreeProvider": False},
                },
            },
            status=200,
        )

        validator.validate("test@example.com")

        assert responses.calls[0].request.headers["X-API-Key"] == "test-key"

    @responses.activate
    def test_validate_includes_user_agent(self, validator):
        responses.add(
            responses.POST,
            "http://localhost:3000/api/validate",
            json={
                "email": "test@example.com",
                "valid": True,
                "score": 95,
                "deliverability": "deliverable",
                "risk": "low",
                "checks": {
                    "syntax": {"valid": True},
                    "domain": {"valid": True, "exists": True},
                    "mx": {"valid": True, "records": []},
                    "disposable": {"isDisposable": False},
                    "roleBased": {"isRoleBased": False},
                    "freeProvider": {"isFreeProvider": False},
                },
            },
            status=200,
        )

        validator.validate("test@example.com")

        assert "EmailValidator-Python-SDK" in responses.calls[0].request.headers["User-Agent"]


class TestValidateBulk:
    @responses.activate
    def test_bulk_validate_success(self, validator):
        responses.add(
            responses.POST,
            "http://localhost:3000/api/validate-bulk",
            json={
                "results": [],
                "summary": {
                    "total": 2,
                    "valid": 2,
                    "invalid": 0,
                    "risky": 0,
                    "unknown": 0,
                },
                "processingTime": 100,
            },
            status=200,
        )

        result = validator.validate_bulk(["a@b.com", "c@d.com"])

        assert result.summary.total == 2

    def test_bulk_validate_empty_list(self, validator):
        with pytest.raises(ValidationError):
            validator.validate_bulk([])

    def test_bulk_validate_none_input(self, validator):
        with pytest.raises(ValidationError):
            validator.validate_bulk(None)

    def test_bulk_validate_too_many(self, validator):
        emails = ["test@example.com"] * 1001
        with pytest.raises(ValidationError) as exc_info:
            validator.validate_bulk(emails)
        assert "Maximum 1000" in str(exc_info.value)


class TestHealthCheck:
    @responses.activate
    def test_health_check_success(self, validator):
        responses.add(
            responses.GET,
            "http://localhost:3000/api/health",
            json={
                "status": "healthy",
                "version": "1.0.0",
                "uptime": 12345,
                "timestamp": "2024-01-01T00:00:00Z",
            },
            status=200,
        )

        result = validator.health_check()

        assert result.status == "healthy"
        assert result.version == "1.0.0"


class TestRetryLogic:
    @responses.activate
    def test_retries_on_500(self):
        validator_with_retry = EmailValidator(
            base_url="http://localhost:3000",
            max_retries=2,
            retry_delay=0.01,
        )

        responses.add(responses.POST, "http://localhost:3000/api/validate", status=500)
        responses.add(responses.POST, "http://localhost:3000/api/validate", status=500)
        responses.add(
            responses.POST,
            "http://localhost:3000/api/validate",
            json={
                "email": "test@example.com",
                "valid": True,
                "score": 95,
                "deliverability": "deliverable",
                "risk": "low",
                "checks": {
                    "syntax": {"valid": True},
                    "domain": {"valid": True, "exists": True},
                    "mx": {"valid": True, "records": []},
                    "disposable": {"isDisposable": False},
                    "roleBased": {"isRoleBased": False},
                    "freeProvider": {"isFreeProvider": False},
                },
            },
            status=200,
        )

        result = validator_with_retry.validate("test@example.com")

        assert result.valid is True
        assert len(responses.calls) == 3


class TestContextManager:
    def test_context_manager(self):
        with EmailValidator(base_url="http://localhost:3000") as validator:
            assert validator is not None
