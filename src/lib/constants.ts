/**
 * Rate limiting configuration for API endpoints.
 */
export const RATE_LIMITS = {
  /** Single email validation: 100 requests per minute */
  singleValidation: { max: 100, window: 60000 },
  /** Bulk email validation: 10 requests per minute */
  bulkValidation: { max: 10, window: 60000 },
  /** Maximum emails per bulk request */
  maxBulkSize: 1000,
};

/**
 * Timeout configuration for validation operations.
 */
export const VALIDATION_TIMEOUTS = {
  /** DNS lookup timeout in milliseconds */
  dns: 5000,
  /** SMTP connection timeout in milliseconds */
  smtp: 10000,
};

/**
 * Email length constraints per RFC 5321.
 */
export const EMAIL_LIMITS = {
  /** Maximum total email length (RFC 5321) */
  maxLength: 254,
  /** Maximum local part length (before @) */
  maxLocalPartLength: 64,
  /** Maximum domain length (after @) */
  maxDomainLength: 255,
  /** Minimum TLD length */
  minTldLength: 2,
};

/**
 * Legacy constant for backwards compatibility.
 * @deprecated Use EMAIL_LIMITS.maxLength instead.
 */
export const MAX_EMAIL_LENGTH = EMAIL_LIMITS.maxLength;

/**
 * History storage limits.
 */
export const HISTORY_LIMITS = {
  /** Maximum number of validation history items to store */
  maxItems: 100,
  /** Maximum age of history items in milliseconds (7 days) */
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Debounce delays for UI interactions.
 */
export const DEBOUNCE_DELAYS = {
  /** Debounce delay for real-time email input validation */
  emailInput: 300,
  /** Debounce delay for search input */
  search: 200,
  /** Debounce delay for form submission */
  submit: 500,
};

/**
 * API request timeouts.
 */
export const API_TIMEOUTS = {
  /** Default API request timeout */
  default: 30000,
  /** Timeout for single email validation */
  singleValidation: 15000,
  /** Timeout for bulk email validation */
  bulkValidation: 60000,
};

export const SCORE_WEIGHTS = {
  syntax: 20,
  domain: 20,
  mx: 25,
  disposable: 15,
  roleBased: 5,
  typo: 10,
  blacklist: 5,
};

export const SCORE_THRESHOLDS = {
  high: 80,
  medium: 50,
};

/**
 * Cache configuration for performance optimization.
 */
export const CACHE_CONFIG = {
  /** MX record cache: 5 minutes TTL */
  mx: { maxSize: 1000, ttlMs: 300000 },
  /** Domain validation cache: 5 minutes TTL */
  domain: { maxSize: 1000, ttlMs: 300000 },
  /** Full validation result cache: 1 minute TTL */
  result: { maxSize: 500, ttlMs: 60000 },
};

/**
 * Bulk validation configuration.
 */
export const BULK_CONFIG = {
  /** Number of emails to process in parallel per batch */
  batchSize: 10,
  /** Delay between batches in milliseconds */
  batchDelayMs: 100,
};
