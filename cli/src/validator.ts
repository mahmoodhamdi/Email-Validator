/**
 * Standalone Email Validator for CLI
 * This module implements email validation logic for the CLI tool.
 */

import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

export interface ValidationResult {
  email: string;
  isValid: boolean;
  score: number;
  deliverability: 'deliverable' | 'risky' | 'undeliverable' | 'unknown';
  risk: 'low' | 'medium' | 'high';
  checks: {
    syntax: { valid: boolean; message: string };
    domain: { valid: boolean; exists: boolean; message: string };
    mx: { valid: boolean; records: string[]; message: string };
    disposable: { isDisposable: boolean; message: string };
    roleBased: { isRoleBased: boolean; role: string | null };
    freeProvider: { isFree: boolean; provider: string | null };
    typo: { hasTypo: boolean; suggestion: string | null };
  };
  timestamp: string;
}

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
  'yopmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
  'sharklasers.com', 'guerrillamail.info', 'grr.la', 'spam4.me',
  'getairmail.com', 'mohmal.com', 'tempail.com', 'tempr.email'
]);

// Free email providers
const FREE_PROVIDERS: Record<string, string> = {
  'gmail.com': 'Gmail',
  'yahoo.com': 'Yahoo',
  'hotmail.com': 'Hotmail',
  'outlook.com': 'Outlook',
  'live.com': 'Live',
  'msn.com': 'MSN',
  'aol.com': 'AOL',
  'icloud.com': 'iCloud',
  'mail.com': 'Mail.com',
  'protonmail.com': 'ProtonMail',
  'zoho.com': 'Zoho'
};

// Role-based email prefixes
const ROLE_PREFIXES = [
  'admin', 'administrator', 'info', 'support', 'sales', 'contact',
  'help', 'noreply', 'no-reply', 'webmaster', 'postmaster', 'hostmaster',
  'abuse', 'privacy', 'security', 'billing', 'accounts', 'feedback',
  'team', 'office', 'hello', 'hi', 'marketing', 'press', 'media', 'hr'
];

// Common typos
const TYPO_CORRECTIONS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com'
};

// Email regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function validateSyntax(email: string): { valid: boolean; message: string } {
  const trimmed = email.trim();

  if (!trimmed) {
    return { valid: false, message: 'Email is empty' };
  }

  if (!trimmed.includes('@')) {
    return { valid: false, message: 'Email must contain @' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, message: 'Invalid email format' };
  }

  const [localPart, domain] = trimmed.split('@');

  if (localPart.length > 64) {
    return { valid: false, message: 'Local part exceeds 64 characters' };
  }

  if (domain.length > 253) {
    return { valid: false, message: 'Domain exceeds 253 characters' };
  }

  return { valid: true, message: 'Valid syntax' };
}

async function validateDomain(domain: string): Promise<{ valid: boolean; exists: boolean; message: string }> {
  try {
    await resolve4(domain);
    return { valid: true, exists: true, message: 'Domain exists' };
  } catch {
    return { valid: false, exists: false, message: 'Domain does not exist or has no A records' };
  }
}

async function validateMx(domain: string): Promise<{ valid: boolean; records: string[]; message: string }> {
  try {
    const records = await resolveMx(domain);
    if (records.length > 0) {
      return {
        valid: true,
        records: records.map(r => r.exchange),
        message: `Found ${records.length} MX record(s)`
      };
    }
    return { valid: false, records: [], message: 'No MX records found' };
  } catch {
    return { valid: false, records: [], message: 'Failed to resolve MX records' };
  }
}

function validateDisposable(domain: string): { isDisposable: boolean; message: string } {
  const isDisposable = DISPOSABLE_DOMAINS.has(domain.toLowerCase());
  return {
    isDisposable,
    message: isDisposable ? 'Disposable email domain detected' : 'Not a known disposable domain'
  };
}

function validateRoleBased(localPart: string): { isRoleBased: boolean; role: string | null } {
  const lower = localPart.toLowerCase();
  for (const prefix of ROLE_PREFIXES) {
    if (lower === prefix || lower.startsWith(prefix + '.') || lower.startsWith(prefix + '-')) {
      return { isRoleBased: true, role: prefix };
    }
  }
  return { isRoleBased: false, role: null };
}

function validateFreeProvider(domain: string): { isFree: boolean; provider: string | null } {
  const provider = FREE_PROVIDERS[domain.toLowerCase()];
  return { isFree: !!provider, provider: provider || null };
}

function validateTypo(domain: string): { hasTypo: boolean; suggestion: string | null } {
  const suggestion = TYPO_CORRECTIONS[domain.toLowerCase()];
  return { hasTypo: !!suggestion, suggestion: suggestion || null };
}

export async function validateEmail(email: string): Promise<ValidationResult> {
  const timestamp = new Date().toISOString();
  const trimmedEmail = email.trim().toLowerCase();

  // Syntax check
  const syntaxCheck = validateSyntax(email);

  if (!syntaxCheck.valid) {
    return createInvalidResult(email, syntaxCheck.message, timestamp);
  }

  const [localPart, domain] = trimmedEmail.split('@');

  // Run async checks in parallel
  const [domainCheck, mxCheck] = await Promise.all([
    validateDomain(domain),
    validateMx(domain)
  ]);

  // Sync checks
  const disposableCheck = validateDisposable(domain);
  const roleBasedCheck = validateRoleBased(localPart);
  const freeProviderCheck = validateFreeProvider(domain);
  const typoCheck = validateTypo(domain);

  // Calculate score
  let score = 0;
  score += syntaxCheck.valid ? 20 : 0;
  score += domainCheck.valid ? 20 : 0;
  score += mxCheck.valid ? 25 : 0;
  score += !disposableCheck.isDisposable ? 15 : 0;
  score += !roleBasedCheck.isRoleBased ? 5 : 0;
  score += !typoCheck.hasTypo ? 10 : 0;
  score += 5; // Base points for blacklist (not implemented in CLI)

  const isValid = syntaxCheck.valid && domainCheck.valid && mxCheck.valid && !typoCheck.hasTypo;

  // Determine deliverability
  let deliverability: ValidationResult['deliverability'];
  if (!syntaxCheck.valid || !domainCheck.valid) {
    deliverability = 'undeliverable';
  } else if (!mxCheck.valid) {
    deliverability = 'unknown';
  } else if (disposableCheck.isDisposable) {
    deliverability = 'risky';
  } else {
    deliverability = 'deliverable';
  }

  // Determine risk
  let risk: ValidationResult['risk'];
  if (score < 50 || typoCheck.hasTypo) {
    risk = 'high';
  } else if (disposableCheck.isDisposable || roleBasedCheck.isRoleBased || score < 80) {
    risk = 'medium';
  } else {
    risk = 'low';
  }

  return {
    email: email.trim(),
    isValid,
    score,
    deliverability,
    risk,
    checks: {
      syntax: syntaxCheck,
      domain: domainCheck,
      mx: mxCheck,
      disposable: disposableCheck,
      roleBased: roleBasedCheck,
      freeProvider: freeProviderCheck,
      typo: typoCheck
    },
    timestamp
  };
}

function createInvalidResult(email: string, message: string, timestamp: string): ValidationResult {
  return {
    email: email.trim(),
    isValid: false,
    score: 0,
    deliverability: 'undeliverable',
    risk: 'high',
    checks: {
      syntax: { valid: false, message },
      domain: { valid: false, exists: false, message: 'Skipped due to syntax error' },
      mx: { valid: false, records: [], message: 'Skipped due to syntax error' },
      disposable: { isDisposable: false, message: 'Skipped' },
      roleBased: { isRoleBased: false, role: null },
      freeProvider: { isFree: false, provider: null },
      typo: { hasTypo: false, suggestion: null }
    },
    timestamp
  };
}
