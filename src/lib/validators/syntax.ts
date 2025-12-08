import type { SyntaxCheck } from '@/types/email';
import { MAX_EMAIL_LENGTH } from '@/lib/constants';

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;

// Simplified regex for common validation
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSyntax(email: string): SyntaxCheck {
  // Trim whitespace
  const trimmedEmail = email.trim();

  // Check if email is empty
  if (!trimmedEmail) {
    return {
      valid: false,
      message: 'Email address is required',
    };
  }

  // Check length
  if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
    return {
      valid: false,
      message: `Email exceeds maximum length of ${MAX_EMAIL_LENGTH} characters`,
    };
  }

  // Check for @ symbol
  if (!trimmedEmail.includes('@')) {
    return {
      valid: false,
      message: 'Email must contain an @ symbol',
    };
  }

  // Split email into local and domain parts
  const atIndex = trimmedEmail.lastIndexOf('@');
  const localPart = trimmedEmail.slice(0, atIndex);
  const domainPart = trimmedEmail.slice(atIndex + 1);

  // Check local part
  if (!localPart) {
    return {
      valid: false,
      message: 'Email must have a local part before @',
    };
  }

  if (localPart.length > 64) {
    return {
      valid: false,
      message: 'Local part exceeds maximum length of 64 characters',
    };
  }

  // Check domain part
  if (!domainPart) {
    return {
      valid: false,
      message: 'Email must have a domain after @',
    };
  }

  if (domainPart.length > 255) {
    return {
      valid: false,
      message: 'Domain exceeds maximum length of 255 characters',
    };
  }

  // Check for valid TLD
  if (!domainPart.includes('.')) {
    return {
      valid: false,
      message: 'Domain must have a valid TLD',
    };
  }

  // Check for double dots
  if (trimmedEmail.includes('..')) {
    return {
      valid: false,
      message: 'Email cannot contain consecutive dots',
    };
  }

  // Check for leading/trailing dots
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return {
      valid: false,
      message: 'Local part cannot start or end with a dot',
    };
  }

  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return {
      valid: false,
      message: 'Domain cannot start or end with a dot',
    };
  }

  // Check for leading/trailing hyphens in domain
  if (domainPart.startsWith('-') || domainPart.endsWith('-')) {
    return {
      valid: false,
      message: 'Domain cannot start or end with a hyphen',
    };
  }

  // Validate against RFC 5322 regex
  if (!EMAIL_REGEX.test(trimmedEmail) && !SIMPLE_EMAIL_REGEX.test(trimmedEmail)) {
    return {
      valid: false,
      message: 'Email format is invalid',
    };
  }

  return {
    valid: true,
    message: 'Email syntax is valid',
  };
}

export function parseEmail(email: string): { localPart: string; domain: string } | null {
  const trimmed = email.trim();
  const atIndex = trimmed.lastIndexOf('@');

  if (atIndex === -1) {
    return null;
  }

  return {
    localPart: trimmed.slice(0, atIndex),
    domain: trimmed.slice(atIndex + 1).toLowerCase(),
  };
}
