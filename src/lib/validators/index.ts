/**
 * Email Validation Module
 *
 * This module provides comprehensive email validation by combining multiple checks:
 * - Syntax: RFC 5322 compliance check
 * - Domain: Format and DNS existence verification
 * - MX Records: Mail server configuration check
 * - Disposable: Temporary/throwaway email detection
 * - Role-Based: Generic email detection (info@, support@, etc.)
 * - Typo: Common domain misspelling detection
 * - Free Provider: Gmail, Yahoo, etc. detection
 * - Blacklist: Known spam source checking
 * - Catch-All: Domains that accept all emails
 * - SMTP: Optional mailbox existence verification
 *
 * Scoring weights are configured in constants.ts and can be adjusted
 * based on business requirements. The default weights prioritize:
 * 1. MX records (25%) - Most critical for deliverability
 * 2. Syntax + Domain (20% each) - Basic validity requirements
 * 3. Disposable (15%) - Important for preventing abuse
 * 4. Typo (10%) - Helps catch user mistakes
 * 5. Role-based + Blacklist (5% each) - Quality indicators
 *
 * Limitations:
 * - SMTP verification may be blocked by some servers
 * - Catch-all detection is heuristic-based
 * - Blacklist data may not be real-time
 * - IDN/punycode emails have limited support
 */
import type { ValidationResult, DeliverabilityStatus, RiskLevel } from '@/types/email';
import { SCORE_WEIGHTS, SCORE_THRESHOLDS, BULK_CONFIG, VALIDATION_TIMEOUTS } from '@/lib/constants';
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
import { checkSMTP, type SMTPCheckResult } from './smtp';

/**
 * Result of bulk validation with early termination support.
 */
export interface BulkValidationResult {
  results: ValidationResult[];
  metadata: {
    total: number;
    completed: number;
    timedOut: boolean;
    processingTimeMs: number;
  };
}

/**
 * Options for email validation
 */
export interface ValidationOptions {
  /** Enable SMTP verification (default: false) */
  smtpCheck?: boolean;
  /** SMTP verification timeout in ms (default: 10000) */
  smtpTimeout?: number;
}

/**
 * Validate a single email address.
 * Results are cached for improved performance on repeated validations.
 *
 * @param email - The email address to validate
 * @param options - Validation options
 * @returns Complete validation result
 */
export async function validateEmail(
  email: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // For SMTP checks, use a different cache key
  const cacheKey = options.smtpCheck
    ? `${normalizedEmail}:smtp`
    : normalizedEmail;

  // Check result cache first (skip cache for SMTP checks to ensure fresh results)
  if (!options.smtpCheck) {
    const cached = resultCache.get(cacheKey);
    if (cached) {
      // Return cached result with updated timestamp
      return {
        ...cached,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Use deduplication to prevent redundant concurrent requests
  return deduplicatedValidate(email, (e) => performValidation(e, options));
}

/**
 * Perform the actual email validation.
 * This is the core validation logic that gets cached.
 */
async function performValidation(
  email: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
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

  // Determine initial validity
  let isValid = syntaxCheck.valid && domainCheck.valid && mxCheck.valid && !typoCheck.hasTypo;

  // Determine initial deliverability
  let deliverability = determineDeliverability(
    syntaxCheck.valid,
    domainCheck.valid,
    mxCheck.valid,
    disposableCheck.isDisposable,
    blacklistCheck.isBlacklisted
  );

  // Determine initial risk
  let risk = determineRisk(
    score,
    disposableCheck.isDisposable,
    roleBasedCheck.isRoleBased,
    typoCheck.hasTypo,
    blacklistCheck.isBlacklisted,
    catchAllCheck.isCatchAll
  );

  // Optional SMTP verification
  let smtpResult: SMTPCheckResult | undefined;
  if (options.smtpCheck && mxCheck.valid && mxCheck.records.length > 0) {
    smtpResult = await checkSMTP(email, mxCheck.records, {
      enabled: true,
      timeout: options.smtpTimeout || 10000,
    });

    // Adjust results based on SMTP verification
    if (smtpResult.checked) {
      if (smtpResult.exists === false) {
        // Mailbox confirmed to not exist
        isValid = false;
        score = Math.min(score, 20);
        deliverability = 'undeliverable';
        risk = 'high';
      } else if (smtpResult.catchAll) {
        // Catch-all server - can't confirm mailbox exists
        score = Math.max(score - 10, 0);
        if (risk === 'low') {
          risk = 'medium';
        }
      }
      // Note: greylisting doesn't affect score (temporary issue)
    }
  }

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
      smtp: smtpResult,
    },
    deliverability,
    risk,
    timestamp,
  };

  // Cache the result
  const cacheKey = options.smtpCheck
    ? `${normalizedEmail}:smtp`
    : normalizedEmail;
  resultCache.set(cacheKey, result);

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
 * Options for bulk validation.
 */
export interface BulkValidationOptions {
  /** Maximum time allowed for bulk validation in ms */
  maxTimeoutMs?: number;
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Validate multiple email addresses in batches with early termination support.
 * Uses batching to avoid overwhelming external services.
 * Pre-fetches unique domains to reduce redundant DNS queries.
 *
 * @param emails - Array of email addresses to validate
 * @param options - Validation options including timeout and progress callback
 * @returns Bulk validation result with metadata
 */
export async function validateEmailBulk(
  emails: string[],
  options: BulkValidationOptions = {}
): Promise<BulkValidationResult> {
  const startTime = Date.now();
  const { maxTimeoutMs = VALIDATION_TIMEOUTS.bulkValidation, onProgress } = options;

  if (emails.length === 0) {
    return {
      results: [],
      metadata: {
        total: 0,
        completed: 0,
        timedOut: false,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  const results: ValidationResult[] = [];
  const { batchSize, batchDelayMs } = BULK_CONFIG;
  let timedOut = false;

  // Minimum time buffer before we stop processing (5 seconds)
  const MIN_TIME_BUFFER = 5000;

  // Pre-fetch unique domains to populate cache (reduces redundant DNS queries)
  const uniqueDomains = extractUniqueDomains(emails);
  await prefetchDomains(uniqueDomains);

  // Process in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const elapsed = Date.now() - startTime;
    const remaining = maxTimeoutMs - elapsed;

    // Check if we're running out of time
    if (remaining < MIN_TIME_BUFFER) {
      timedOut = true;
      break;
    }

    const batch = emails.slice(i, i + batchSize);

    // Process batch in parallel with per-email timeout
    const batchResults = await Promise.all(
      batch.map(async (email) => {
        try {
          return await validateEmail(email);
        } catch {
          // If individual email validation fails, create a failed result
          return createTimeoutResult(email);
        }
      })
    );
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

  return {
    results,
    metadata: {
      total: emails.length,
      completed: results.length,
      timedOut,
      processingTimeMs: Date.now() - startTime,
    },
  };
}

/**
 * Extract unique domains from email list.
 */
function extractUniqueDomains(emails: string[]): string[] {
  const domains = new Set<string>();

  for (const email of emails) {
    const atIndex = email.lastIndexOf('@');
    if (atIndex > 0 && atIndex < email.length - 1) {
      const domain = email.substring(atIndex + 1).toLowerCase().trim();
      if (domain) {
        domains.add(domain);
      }
    }
  }

  return Array.from(domains);
}

/**
 * Pre-fetch domain validation results to populate cache.
 * This ensures subsequent email validations hit the cache.
 */
async function prefetchDomains(domains: string[]): Promise<void> {
  // Process in batches of 20 to avoid overwhelming DNS
  const prefetchBatchSize = 20;

  for (let i = 0; i < domains.length; i += prefetchBatchSize) {
    const batch = domains.slice(i, i + prefetchBatchSize);

    await Promise.allSettled(
      batch.map(async (domain) => {
        try {
          // Prefetch both domain and MX records
          await Promise.all([
            validateDomain(domain),
            validateMx(domain),
          ]);
        } catch {
          // Ignore prefetch errors - actual validation will handle them
        }
      })
    );
  }
}

/**
 * Create a timeout result for an email that couldn't be validated.
 */
function createTimeoutResult(email: string): ValidationResult {
  return {
    email: email.trim(),
    isValid: false,
    score: 0,
    checks: {
      syntax: { valid: false, message: 'Validation timed out' },
      domain: { valid: false, exists: false, message: 'Skipped due to timeout' },
      mx: { valid: false, records: [], message: 'Skipped due to timeout' },
      disposable: { isDisposable: false, message: 'Skipped' },
      roleBased: { isRoleBased: false, role: null },
      freeProvider: { isFree: false, provider: null },
      typo: { hasTypo: false, suggestion: null },
      blacklisted: { isBlacklisted: false, lists: [] },
      catchAll: { isCatchAll: false },
    },
    deliverability: 'unknown',
    risk: 'high',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper function to create a delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { parseEmail } from './syntax';
