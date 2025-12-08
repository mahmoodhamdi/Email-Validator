import type { ValidationResult, DeliverabilityStatus, RiskLevel } from '@/types/email';
import { SCORE_WEIGHTS, SCORE_THRESHOLDS } from '@/lib/constants';
import { validateSyntax, parseEmail } from './syntax';
import { validateDomain } from './domain';
import { validateMx } from './mx';
import { validateDisposable } from './disposable';
import { validateRoleBased } from './role-based';
import { validateTypo } from './typo';
import { validateFreeProvider } from './free-provider';

export async function validateEmail(email: string): Promise<ValidationResult> {
  const timestamp = new Date().toISOString();

  // Step 1: Syntax validation
  const syntaxCheck = validateSyntax(email);

  if (!syntaxCheck.valid) {
    return createInvalidResult(email, syntaxCheck.message, timestamp);
  }

  // Parse email
  const parsed = parseEmail(email);
  if (!parsed) {
    return createInvalidResult(email, 'Failed to parse email', timestamp);
  }

  const { localPart, domain } = parsed;

  // Run all checks in parallel where possible
  const [domainCheck, mxCheck] = await Promise.all([
    validateDomain(domain),
    validateMx(domain),
  ]);

  const disposableCheck = validateDisposable(domain);
  const roleBasedCheck = validateRoleBased(localPart);
  const typoCheck = validateTypo(domain);
  const freeProviderCheck = validateFreeProvider(domain);

  // Calculate score
  let score = 0;

  // Syntax is valid (already checked)
  score += SCORE_WEIGHTS.syntax;

  // Domain check
  if (domainCheck.valid) {
    score += SCORE_WEIGHTS.domain;
  }

  // MX check
  if (mxCheck.valid) {
    score += SCORE_WEIGHTS.mx;
  }

  // Disposable check (deduct if disposable)
  if (!disposableCheck.isDisposable) {
    score += SCORE_WEIGHTS.disposable;
  }

  // Role-based check (deduct if role-based)
  if (!roleBasedCheck.isRoleBased) {
    score += SCORE_WEIGHTS.roleBased;
  }

  // Typo check (deduct if typo detected)
  if (!typoCheck.hasTypo) {
    score += SCORE_WEIGHTS.typo;
  }

  // Blacklist check (placeholder - always passes for now)
  score += SCORE_WEIGHTS.blacklist;

  // Determine validity
  const isValid = syntaxCheck.valid && domainCheck.valid && mxCheck.valid && !typoCheck.hasTypo;

  // Determine deliverability
  const deliverability = determineDeliverability(
    syntaxCheck.valid,
    domainCheck.valid,
    mxCheck.valid,
    disposableCheck.isDisposable
  );

  // Determine risk
  const risk = determineRisk(
    score,
    disposableCheck.isDisposable,
    roleBasedCheck.isRoleBased,
    typoCheck.hasTypo
  );

  return {
    email: email.trim(),
    isValid,
    score,
    checks: {
      syntax: syntaxCheck,
      domain: domainCheck,
      mx: mxCheck,
      disposable: disposableCheck,
      roleBased: roleBasedCheck,
      freeProvider: freeProviderCheck,
      typo: typoCheck,
      blacklisted: {
        isBlacklisted: false,
        lists: [],
      },
      catchAll: {
        isCatchAll: false,
      },
    },
    deliverability,
    risk,
    timestamp,
  };
}

function createInvalidResult(
  email: string,
  message: string,
  timestamp: string
): ValidationResult {
  return {
    email: email.trim(),
    isValid: false,
    score: 0,
    checks: {
      syntax: { valid: false, message },
      domain: { valid: false, exists: false, message: 'Skipped due to syntax error' },
      mx: { valid: false, records: [], message: 'Skipped due to syntax error' },
      disposable: { isDisposable: false, message: 'Skipped' },
      roleBased: { isRoleBased: false, role: null },
      freeProvider: { isFree: false, provider: null },
      typo: { hasTypo: false, suggestion: null },
      blacklisted: { isBlacklisted: false, lists: [] },
      catchAll: { isCatchAll: false },
    },
    deliverability: 'undeliverable',
    risk: 'high',
    timestamp,
  };
}

function determineDeliverability(
  syntaxValid: boolean,
  domainValid: boolean,
  mxValid: boolean,
  isDisposable: boolean
): DeliverabilityStatus {
  if (!syntaxValid || !domainValid) {
    return 'undeliverable';
  }

  if (!mxValid) {
    return 'unknown';
  }

  if (isDisposable) {
    return 'risky';
  }

  return 'deliverable';
}

function determineRisk(
  score: number,
  isDisposable: boolean,
  isRoleBased: boolean,
  hasTypo: boolean
): RiskLevel {
  if (score < SCORE_THRESHOLDS.medium || hasTypo) {
    return 'high';
  }

  if (isDisposable || isRoleBased || score < SCORE_THRESHOLDS.high) {
    return 'medium';
  }

  return 'low';
}

export async function validateEmailBulk(emails: string[]): Promise<ValidationResult[]> {
  const results = await Promise.all(emails.map(validateEmail));
  return results;
}

export { parseEmail } from './syntax';
