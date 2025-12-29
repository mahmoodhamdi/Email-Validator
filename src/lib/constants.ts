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
  /** Single email validation timeout in milliseconds */
  singleValidation: 15000,
  /** Bulk validation max timeout in milliseconds (Vercel limit is 60s) */
  bulkValidation: 55000,
  /** Per-email timeout for bulk validation in milliseconds */
  perEmailBulk: 200,
};

/**
 * Circuit breaker configuration for DNS service.
 */
export const DNS_CIRCUIT_BREAKER = {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: 5,
  /** Time in ms before attempting to close the circuit */
  resetTimeoutMs: 30000, // 30 seconds
  /** Number of successful requests before closing */
  successThreshold: 2,
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
  /** Minimum email length (a@b.c) */
  minLength: 5,
};

/**
 * Input size limits for API requests.
 * These limits protect against denial-of-service attacks.
 */
export const INPUT_LIMITS = {
  /** Maximum request body size (1MB) */
  maxRequestBodySize: 1024 * 1024,
  /** Maximum textarea input size for bulk emails (100KB) */
  maxTextareaSize: 100 * 1024,
  /** Maximum file upload size (10MB) */
  maxFileSize: 10 * 1024 * 1024,
  /** Maximum emails per bulk request */
  maxBulkEmails: 1000,
  /** Maximum length of a single email */
  maxEmailLength: 254,
  /** Minimum length of a single email */
  minEmailLength: 5,
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
 * TTLs are optimized for balance between freshness and performance.
 */
export const CACHE_CONFIG = {
  /** MX record cache: 5 minutes TTL */
  mx: { maxSize: 2000, ttlMs: 5 * 60 * 1000 },
  /** Domain validation cache: 10 minutes TTL */
  domain: { maxSize: 2000, ttlMs: 10 * 60 * 1000 },
  /** Full validation result cache: 5 minutes TTL */
  result: { maxSize: 1000, ttlMs: 5 * 60 * 1000 },
  /** Catch-all detection cache: 1 hour TTL */
  catchAll: { maxSize: 500, ttlMs: 60 * 60 * 1000 },
  /** Blacklist cache: 30 minutes TTL */
  blacklist: { maxSize: 1000, ttlMs: 30 * 60 * 1000 },
  /** Negative cache for failed DNS lookups: 1 minute TTL */
  dnsNegative: { maxSize: 500, ttlMs: 60 * 1000 },
};

/**
 * Common email domains for cache warming.
 * These domains are pre-cached on startup for better performance.
 */
export const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'live.com',
  'msn.com',
  'yandex.com',
  'gmx.com',
  'zoho.com',
];

/**
 * Bulk validation configuration.
 * Optimized for performance while respecting rate limits.
 */
export const BULK_CONFIG = {
  /** Number of emails to process in parallel per batch */
  batchSize: 50,
  /** Delay between batches in milliseconds */
  batchDelayMs: 50,
  /** Maximum concurrent validations across all batches */
  maxConcurrent: 100,
  /** Use streaming response if more than this many emails */
  streamThreshold: 100,
  /** Use background job if more than this many emails */
  jobThreshold: 500,
  /** Maximum time for a single batch in milliseconds */
  batchTimeoutMs: 10000,
};
