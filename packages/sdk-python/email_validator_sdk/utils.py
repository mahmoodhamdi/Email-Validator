"""Utility functions for Email Validator SDK."""

import re
import random
import time
from typing import Optional


def get_backoff_delay(attempt: int, base_delay: float) -> float:
    """Calculate exponential backoff delay with jitter."""
    delay = base_delay * (2**attempt)
    jitter = random.uniform(0, 0.1)
    return delay + jitter


def is_retryable_status(status_code: Optional[int]) -> bool:
    """Check if HTTP status code is retryable."""
    if status_code is None:
        return True  # Network errors are retryable
    return status_code >= 500 or status_code == 429 or status_code == 408


def is_valid_email_format(email: str) -> bool:
    """Basic email format validation."""
    pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    return bool(re.match(pattern, email))


def sleep(seconds: float) -> None:
    """Sleep for specified seconds."""
    time.sleep(seconds)
