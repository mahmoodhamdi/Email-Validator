"""
Type definitions for Email Validator SDK
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any


@dataclass
class ValidateOptions:
    """Options for email validation"""
    smtp_check: bool = False
    auth_check: bool = False
    reputation_check: bool = False
    gravatar_check: bool = False
    webhook_url: Optional[str] = None


@dataclass
class SyntaxCheck:
    valid: bool
    message: str


@dataclass
class DomainCheck:
    valid: bool
    exists: bool
    message: str


@dataclass
class MxCheck:
    valid: bool
    records: List[str]
    message: str


@dataclass
class DisposableCheck:
    is_disposable: bool
    message: str


@dataclass
class RoleBasedCheck:
    is_role_based: bool
    role: Optional[str]


@dataclass
class FreeProviderCheck:
    is_free: bool
    provider: Optional[str]


@dataclass
class TypoCheck:
    has_typo: bool
    suggestion: Optional[str]


@dataclass
class BlacklistCheck:
    is_blacklisted: bool
    lists: List[str]


@dataclass
class CatchAllCheck:
    is_catch_all: bool


@dataclass
class ValidationChecks:
    syntax: SyntaxCheck
    domain: DomainCheck
    mx: MxCheck
    disposable: DisposableCheck
    role_based: RoleBasedCheck
    free_provider: FreeProviderCheck
    typo: TypoCheck
    blacklisted: BlacklistCheck
    catch_all: CatchAllCheck
    smtp: Optional[Dict[str, Any]] = None
    authentication: Optional[Dict[str, Any]] = None
    reputation: Optional[Dict[str, Any]] = None
    gravatar: Optional[Dict[str, Any]] = None


@dataclass
class ValidationResult:
    """Result of email validation"""
    email: str
    is_valid: bool
    score: int
    deliverability: str  # 'deliverable' | 'risky' | 'undeliverable' | 'unknown'
    risk: str  # 'low' | 'medium' | 'high'
    checks: ValidationChecks
    timestamp: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ValidationResult":
        """Create ValidationResult from API response dictionary"""
        checks_data = data.get("checks", {})

        checks = ValidationChecks(
            syntax=SyntaxCheck(**checks_data.get("syntax", {"valid": False, "message": ""})),
            domain=DomainCheck(**checks_data.get("domain", {"valid": False, "exists": False, "message": ""})),
            mx=MxCheck(**checks_data.get("mx", {"valid": False, "records": [], "message": ""})),
            disposable=DisposableCheck(
                is_disposable=checks_data.get("disposable", {}).get("isDisposable", False),
                message=checks_data.get("disposable", {}).get("message", "")
            ),
            role_based=RoleBasedCheck(
                is_role_based=checks_data.get("roleBased", {}).get("isRoleBased", False),
                role=checks_data.get("roleBased", {}).get("role")
            ),
            free_provider=FreeProviderCheck(
                is_free=checks_data.get("freeProvider", {}).get("isFree", False),
                provider=checks_data.get("freeProvider", {}).get("provider")
            ),
            typo=TypoCheck(
                has_typo=checks_data.get("typo", {}).get("hasTypo", False),
                suggestion=checks_data.get("typo", {}).get("suggestion")
            ),
            blacklisted=BlacklistCheck(
                is_blacklisted=checks_data.get("blacklisted", {}).get("isBlacklisted", False),
                lists=checks_data.get("blacklisted", {}).get("lists", [])
            ),
            catch_all=CatchAllCheck(
                is_catch_all=checks_data.get("catchAll", {}).get("isCatchAll", False)
            ),
            smtp=checks_data.get("smtp"),
            authentication=checks_data.get("authentication"),
            reputation=checks_data.get("reputation"),
            gravatar=checks_data.get("gravatar"),
        )

        return cls(
            email=data.get("email", ""),
            is_valid=data.get("isValid", False),
            score=data.get("score", 0),
            deliverability=data.get("deliverability", "unknown"),
            risk=data.get("risk", "high"),
            checks=checks,
            timestamp=data.get("timestamp", ""),
        )


@dataclass
class BulkValidationMetadata:
    total: int
    completed: int
    duplicates_removed: int
    invalid_removed: int
    timed_out: bool
    processing_time_ms: int


@dataclass
class BulkValidationResult:
    """Result of bulk email validation"""
    results: List[ValidationResult]
    metadata: BulkValidationMetadata

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BulkValidationResult":
        """Create BulkValidationResult from API response dictionary"""
        results = [
            ValidationResult.from_dict(r) for r in data.get("results", [])
        ]

        meta = data.get("metadata", {})
        metadata = BulkValidationMetadata(
            total=meta.get("total", 0),
            completed=meta.get("completed", 0),
            duplicates_removed=meta.get("duplicatesRemoved", 0),
            invalid_removed=meta.get("invalidRemoved", 0),
            timed_out=meta.get("timedOut", False),
            processing_time_ms=meta.get("processingTimeMs", 0),
        )

        return cls(results=results, metadata=metadata)
