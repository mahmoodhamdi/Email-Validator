import type { SyntaxCheck } from '@/types/email';
import { EMAIL_LIMITS } from '@/lib/constants';
import { EMAIL_REGEX, SIMPLE_EMAIL_REGEX } from './patterns';

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
  if (trimmedEmail.length > EMAIL_LIMITS.maxLength) {
    return {
      valid: false,
      message: `Email exceeds maximum length of ${EMAIL_LIMITS.maxLength} characters`,
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

  if (localPart.length > EMAIL_LIMITS.maxLocalPartLength) {
    return {
      valid: false,
      message: `Local part exceeds maximum length of ${EMAIL_LIMITS.maxLocalPartLength} characters`,
    };
  }

  // Check domain part
  if (!domainPart) {
    return {
      valid: false,
      message: 'Email must have a domain after @',
    };
  }

  if (domainPart.length > EMAIL_LIMITS.maxDomainLength) {
    return {
      valid: false,
      message: `Domain exceeds maximum length of ${EMAIL_LIMITS.maxDomainLength} characters`,
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
