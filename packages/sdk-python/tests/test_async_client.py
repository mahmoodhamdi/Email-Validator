"""Tests for asynchronous client."""

import pytest
from aioresponses import aioresponses

from email_validator_sdk import (
    AsyncEmailValidator,
    ValidationError,
    AuthenticationError,
    RateLimitError,
)


@pytest.fixture
def async_validator():
    return AsyncEmailValidator(
        base_url="http://localhost:3000",
        api_key="test-key",
        max_retries=0,
    )


class TestAsyncValidate:
    @pytest.mark.asyncio
    async def test_validate_success(self, async_validator):
        with aioresponses() as m:
            m.post(
                "http://localhost:3000/api/validate",
                payload={
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
            )

            result = await async_validator.validate("test@example.com")

            assert result.valid is True
            assert result.score == 95

        await async_validator.close()

    @pytest.mark.asyncio
    async def test_validate_empty_email(self, async_validator):
        with pytest.raises(ValidationError):
            await async_validator.validate("")
        await async_validator.close()

    @pytest.mark.asyncio
    async def test_validate_invalid_format(self, async_validator):
        with pytest.raises(ValidationError):
            await async_validator.validate("not-an-email")
        await async_validator.close()

    @pytest.mark.asyncio
    async def test_validate_unauthorized(self, async_validator):
        with aioresponses() as m:
            m.post(
                "http://localhost:3000/api/validate",
                payload={"error": "Unauthorized"},
                status=401,
            )

            with pytest.raises(AuthenticationError):
                await async_validator.validate("test@example.com")

        await async_validator.close()

    @pytest.mark.asyncio
    async def test_validate_rate_limited(self, async_validator):
        with aioresponses() as m:
            m.post(
                "http://localhost:3000/api/validate",
                payload={"error": "Rate limited"},
                status=429,
                headers={"Retry-After": "60"},
            )

            with pytest.raises(RateLimitError) as exc_info:
                await async_validator.validate("test@example.com")

            assert exc_info.value.retry_after == 60

        await async_validator.close()


class TestAsyncValidateBulk:
    @pytest.mark.asyncio
    async def test_bulk_validate_success(self, async_validator):
        with aioresponses() as m:
            m.post(
                "http://localhost:3000/api/validate-bulk",
                payload={
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
            )

            result = await async_validator.validate_bulk(["a@b.com", "c@d.com"])

            assert result.summary.total == 2

        await async_validator.close()

    @pytest.mark.asyncio
    async def test_bulk_validate_empty_list(self, async_validator):
        with pytest.raises(ValidationError):
            await async_validator.validate_bulk([])
        await async_validator.close()

    @pytest.mark.asyncio
    async def test_bulk_validate_too_many(self, async_validator):
        emails = ["test@example.com"] * 1001
        with pytest.raises(ValidationError):
            await async_validator.validate_bulk(emails)
        await async_validator.close()


class TestAsyncHealthCheck:
    @pytest.mark.asyncio
    async def test_health_check_success(self, async_validator):
        with aioresponses() as m:
            m.get(
                "http://localhost:3000/api/health",
                payload={
                    "status": "healthy",
                    "version": "1.0.0",
                    "uptime": 12345,
                    "timestamp": "2024-01-01T00:00:00Z",
                },
            )

            result = await async_validator.health_check()

            assert result.status == "healthy"

        await async_validator.close()


class TestAsyncContextManager:
    @pytest.mark.asyncio
    async def test_async_context_manager(self):
        async with AsyncEmailValidator(base_url="http://localhost:3000") as validator:
            assert validator is not None
