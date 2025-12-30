"""Type definitions for Email Validator SDK."""

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Dict, Any


class Deliverability(str, Enum):
    """Email deliverability status."""

    DELIVERABLE = "deliverable"
    RISKY = "risky"
    UNDELIVERABLE = "undeliverable"
    UNKNOWN = "unknown"


class RiskLevel(str, Enum):
    """Email risk level."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class SyntaxCheck:
    """Syntax validation result."""

    valid: bool
    local_part: Optional[str] = None
    domain: Optional[str] = None


@dataclass
class DomainCheck:
    """Domain validation result."""

    valid: bool
    exists: bool


@dataclass
class MXCheck:
    """MX record validation result."""

    valid: bool
    records: List[str]
    priority: Optional[List[int]] = None


@dataclass
class DisposableCheck:
    """Disposable email check result."""

    is_disposable: bool


@dataclass
class RoleBasedCheck:
    """Role-based email check result."""

    is_role_based: bool
    role: Optional[str] = None


@dataclass
class FreeProviderCheck:
    """Free provider check result."""

    is_free_provider: bool
    provider: Optional[str] = None


@dataclass
class TypoCheck:
    """Typo detection result."""

    has_typo: bool
    suggestion: Optional[str] = None


@dataclass
class SMTPCheck:
    """SMTP verification result."""

    checked: bool
    exists: Optional[bool]
    catch_all: bool
    message: str


@dataclass
class AuthenticationCheck:
    """Email authentication check result."""

    checked: bool
    score: int
    spf: Dict[str, Any]
    dmarc: Dict[str, Any]
    dkim: Dict[str, Any]


@dataclass
class ReputationCheck:
    """Domain reputation check result."""

    checked: bool
    score: int
    risk: str


@dataclass
class GravatarCheck:
    """Gravatar check result."""

    checked: bool
    exists: bool
    url: Optional[str] = None


@dataclass
class ValidationChecks:
    """All validation check results."""

    syntax: SyntaxCheck
    domain: DomainCheck
    mx: MXCheck
    disposable: DisposableCheck
    role_based: RoleBasedCheck
    free_provider: FreeProviderCheck
    typo: Optional[TypoCheck] = None
    smtp: Optional[SMTPCheck] = None
    authentication: Optional[AuthenticationCheck] = None
    reputation: Optional[ReputationCheck] = None
    gravatar: Optional[GravatarCheck] = None


@dataclass
class ValidationResult:
    """Email validation result."""

    email: str
    valid: bool
    score: int
    deliverability: Deliverability
    risk: RiskLevel
    checks: ValidationChecks
    suggestions: Optional[List[str]] = None
    validated_at: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ValidationResult":
        """Create ValidationResult from API response dict."""
        checks_data = data.get("checks", {})

        checks = ValidationChecks(
            syntax=SyntaxCheck(**checks_data.get("syntax", {"valid": False})),
            domain=DomainCheck(**checks_data.get("domain", {"valid": False, "exists": False})),
            mx=MXCheck(**checks_data.get("mx", {"valid": False, "records": []})),
            disposable=DisposableCheck(
                is_disposable=checks_data.get("disposable", {}).get("isDisposable", False)
            ),
            role_based=RoleBasedCheck(
                is_role_based=checks_data.get("roleBased", {}).get("isRoleBased", False),
                role=checks_data.get("roleBased", {}).get("role"),
            ),
            free_provider=FreeProviderCheck(
                is_free_provider=checks_data.get("freeProvider", {}).get("isFreeProvider", False),
                provider=checks_data.get("freeProvider", {}).get("provider"),
            ),
        )

        return cls(
            email=data["email"],
            valid=data["valid"],
            score=data["score"],
            deliverability=Deliverability(data["deliverability"]),
            risk=RiskLevel(data["risk"]),
            checks=checks,
            suggestions=data.get("suggestions"),
            validated_at=data.get("validatedAt"),
        )


@dataclass
class BulkSummary:
    """Bulk validation summary."""

    total: int
    valid: int
    invalid: int
    risky: int
    unknown: int


@dataclass
class BulkValidationResult:
    """Bulk validation result."""

    results: List[ValidationResult]
    summary: BulkSummary
    processing_time: float

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BulkValidationResult":
        """Create BulkValidationResult from API response dict."""
        return cls(
            results=[ValidationResult.from_dict(r) for r in data["results"]],
            summary=BulkSummary(**data["summary"]),
            processing_time=data["processingTime"],
        )


@dataclass
class HealthCheckResult:
    """Health check result."""

    status: str
    version: str
    uptime: float
    timestamp: str


@dataclass
class ValidationOptions:
    """Options for email validation."""

    smtp_check: bool = False
    auth_check: bool = False
    reputation_check: bool = False
    gravatar_check: bool = False

    def to_dict(self) -> Dict[str, bool]:
        """Convert to API request dict."""
        return {
            "smtpCheck": self.smtp_check,
            "authCheck": self.auth_check,
            "reputationCheck": self.reputation_check,
            "gravatarCheck": self.gravatar_check,
        }
