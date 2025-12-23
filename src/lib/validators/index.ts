import type { ValidationResult, DeliverabilityStatus, RiskLevel } from '@/types/email';
import { SCORE_WEIGHTS, SCORE_THRESHOLDS, BULK_CONFIG } from '@/lib/constants';
import { resultCache } from '@/lib/cache';
import { deduplicatedValidate } from '@/lib/request-dedup';
import { validateSyntax, parseEmail } from './syntax';
import { validateDomain } from './domain';
import { validateMx } from './mx';
import { validateDisposable } from './disposable';
import { validateRoleBased } from './role-based';
import { validateTypo } from './typo';
import { validateFreeProvider } from './free-provider';
import { validateBlacklist } from './blacklist';
import { validateCatchAll } from './catch-all';

/**
 * Validate a single email address.
 * Results are cached for improved performance on repeated validations.
 *
 * @param email - The email address to validate
 * @returns Complete validation result
 */
export async function validateEmail(email: string): Promise<ValidationResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check result cache first
  const cached = resultCache.get(normalizedEmail);
  if (cached) {
    // Return cached result with updated timestamp
    return {
      ...cached,
      timestamp: new Date().toISOString(),
    };
  }

  // Use deduplication to prevent redundant concurrent requests
  return deduplicatedValidate(email, performValidation);
}

/**
 * Perform the actual email validation.
 * This is the core validation logic that gets cached.
 */
async function performValidation(email: string): Promise<ValidationResult> {
  const timestamp = new Date().toISOString();
  const normalizedEmail = email.toLowerCase().trim();

  // Step 1: Syntax validation
  const syntaxCheck = validateSyntax(email);

  if (!syntaxCheck.valid) {
    const result = createInvalidResult(email, syntaxCheck.message, timestamp);
    // Cache invalid results too (they won't change)
    resultCache.set(normalizedEmail, result);
    return result;
  }

  // Parse email
  const parsed = parseEmail(email);
  if (!parsed) {
    const result = createInvalidResult(email, 'Failed to parse email', timestamp);
    resultCache.set(normalizedEmail, result);
    return result;
  }

  const { localPart, domain } = parsed;

  // Run all async checks in parallel
  const [domainCheck, mxCheck, blacklistCheck] = await Promise.all([
    validateDomain(domain),
    validateMx(domain),
    validateBlacklist(domain),
  ]);

  // Run synchronous checks
  const disposableCheck = validateDisposable(domain);
  const roleBasedCheck = validateRoleBased(localPart);
  const typoCheck = validateTypo(domain);
  const freeProviderCheck = validateFreeProvider(domain);
  const catchAllCheck = validateCatchAll(domain);

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

  // Blacklist check (deduct if blacklisted)
  if (!blacklistCheck.isBlacklisted) {
    score += SCORE_WEIGHTS.blacklist;
  }

  // Determine validity
  const isValid = syntaxCheck.valid && domainCheck.valid && mxCheck.valid && !typoCheck.hasTypo;

  // Determine deliverability
  const deliverability = determineDeliverability(
    syntaxCheck.valid,
    domainCheck.valid,
    mxCheck.valid,
    disposableCheck.isDisposable,
    blacklistCheck.isBlacklisted
  );

  // Determine risk
  const risk = determineRisk(
    score,
    disposableCheck.isDisposable,
    roleBasedCheck.isRoleBased,
    typoCheck.hasTypo,
    blacklistCheck.isBlacklisted,
    catchAllCheck.isCatchAll
  );

  const result: ValidationResult = {
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
      blacklisted: blacklistCheck,
      catchAll: catchAllCheck,
    },
    deliverability,
    risk,
    timestamp,
  };

  // Cache the result
  resultCache.set(normalizedEmail, result);

  return result;
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
  isDisposable: boolean,
  isBlacklisted: boolean
): DeliverabilityStatus {
  if (!syntaxValid || !domainValid) {
    return 'undeliverable';
  }

  if (!mxValid) {
    return 'unknown';
  }

  if (isDisposable || isBlacklisted) {
    return 'risky';
  }

  return 'deliverable';
}

function determineRisk(
  score: number,
  isDisposable: boolean,
  isRoleBased: boolean,
  hasTypo: boolean,
  isBlacklisted: boolean,
  isCatchAll: boolean
): RiskLevel {
  if (score < SCORE_THRESHOLDS.medium || hasTypo || isBlacklisted) {
    return 'high';
  }

  if (isDisposable || isRoleBased || isCatchAll || score < SCORE_THRESHOLDS.high) {
    return 'medium';
  }

  return 'low';
}

/**
 * Validate multiple email addresses in batches.
 * Uses batching to avoid overwhelming external services.
 *
 * @param emails - Array of email addresses to validate
 * @param onProgress - Optional callback for progress updates
 * @returns Array of validation results
 */
export async function validateEmailBulk(
  emails: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<ValidationResult[]> {
  if (emails.length === 0) {
    return [];
  }

  const results: ValidationResult[] = [];
  const { batchSize, batchDelayMs } = BULK_CONFIG;

  // Process in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.all(batch.map(validateEmail));
    results.push(...batchResults);

    // Report progress
    if (onProgress) {
      onProgress(results.length, emails.length);
    }

    // Add delay between batches (except for the last batch)
    if (i + batchSize < emails.length && batchDelayMs > 0) {
      await delay(batchDelayMs);
    }
  }

  return results;
}

/**
 * Helper function to create a delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { parseEmail } from './syntax';
