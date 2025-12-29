/**
 * Zod validation schemas for API request validation.
 * Provides type-safe request parsing and validation.
 */

import { z } from 'zod';
import { EMAIL_LIMITS, INPUT_LIMITS } from './constants';

/**
 * Email validation regex (RFC 5322 simplified).
 * This is a simplified version that covers most valid email formats.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Dangerous patterns that should be rejected in email input.
 */
const DANGEROUS_PATTERNS = [
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:/i,
  /<script/i,
  /on\w+\s*=/i,
];

/**
 * Check if email contains dangerous patterns.
 */
function containsDangerousPatterns(email: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(email));
}

/**
 * Schema for a single email string with comprehensive validation.
 */
const emailSchema = z
  .string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string',
  })
  .min(INPUT_LIMITS.minEmailLength, `Email must be at least ${INPUT_LIMITS.minEmailLength} characters`)
  .max(INPUT_LIMITS.maxEmailLength, `Email exceeds maximum length of ${INPUT_LIMITS.maxEmailLength} characters`)
  .transform((val) => val.trim().toLowerCase())
  .refine((val) => val.includes('@'), {
    message: 'Email must contain @ symbol',
  })
  .refine((val) => {
    const atIndex = val.indexOf('@');
    const localPart = val.slice(0, atIndex);
    return localPart.length > 0 && localPart.length <= EMAIL_LIMITS.maxLocalPartLength;
  }, {
    message: `Local part (before @) must be 1-${EMAIL_LIMITS.maxLocalPartLength} characters`,
  })
  .refine((val) => {
    const atIndex = val.indexOf('@');
    const domainPart = val.slice(atIndex + 1);
    return domainPart.length > 0 && domainPart.length <= EMAIL_LIMITS.maxDomainLength;
  }, {
    message: `Domain part (after @) must be 1-${EMAIL_LIMITS.maxDomainLength} characters`,
  })
  .refine((val) => {
    const atIndex = val.indexOf('@');
    const domainPart = val.slice(atIndex + 1);
    return domainPart.includes('.');
  }, {
    message: 'Domain must contain at least one dot',
  })
  .refine((val) => !containsDangerousPatterns(val), {
    message: 'Email contains invalid characters',
  })
  .refine((val) => EMAIL_REGEX.test(val), {
    message: 'Invalid email format',
  });

/**
 * Schema for single email validation request.
 */
export const singleEmailRequestSchema = z.object({
  email: emailSchema,
  /** Enable SMTP verification (optional, default: false) */
  smtpCheck: z.boolean().optional().default(false),
});

/**
 * Schema for bulk email validation request.
 */
export const bulkEmailRequestSchema = z.object({
  emails: z
    .array(
      z
        .string()
        .min(1, 'Email cannot be empty')
        .max(INPUT_LIMITS.maxEmailLength, `Email exceeds maximum length of ${INPUT_LIMITS.maxEmailLength} characters`),
      {
        required_error: 'Emails array is required',
        invalid_type_error: 'Emails must be an array',
      }
    )
    .min(1, 'Emails array cannot be empty')
    .max(
      INPUT_LIMITS.maxBulkEmails,
      `Maximum ${INPUT_LIMITS.maxBulkEmails} emails allowed per request`
    ),
});

/**
 * Schema for validating API key in request body (if needed).
 */
export const apiKeySchema = z
  .string()
  .min(16, 'API key must be at least 16 characters')
  .max(128, 'API key cannot exceed 128 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'API key contains invalid characters');

/**
 * Type for validated single email request.
 */
export type SingleEmailRequest = z.infer<typeof singleEmailRequestSchema>;

/**
 * Type for validated bulk email request.
 */
export type BulkEmailRequest = z.infer<typeof bulkEmailRequestSchema>;

/**
 * Parse result type for schema validation.
 */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; errors?: string[] };

/**
 * Parse and validate single email request.
 *
 * @param data - Raw request data
 * @returns Validated request data or error
 */
export function parseSingleEmailRequest(data: unknown): ParseResult<SingleEmailRequest> {
  try {
    const result = singleEmailRequestSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => e.message);
      return {
        success: false,
        error: errors[0],
        errors,
      };
    }
    return { success: false, error: 'Invalid request data' };
  }
}

/**
 * Parse and validate bulk email request.
 *
 * @param data - Raw request data
 * @returns Validated request data or error
 */
export function parseBulkEmailRequest(data: unknown): ParseResult<BulkEmailRequest> {
  try {
    const result = bulkEmailRequestSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => e.message);
      return {
        success: false,
        error: errors[0],
        errors,
      };
    }
    return { success: false, error: 'Invalid request data' };
  }
}

/**
 * Validate a single email string without the full request object.
 *
 * @param email - Email string to validate
 * @returns Validation result
 */
export function validateEmailFormat(email: unknown): ParseResult<string> {
  try {
    const result = emailSchema.parse(email);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => e.message);
      return {
        success: false,
        error: errors[0],
        errors,
      };
    }
    return { success: false, error: 'Invalid email format' };
  }
}

/**
 * Safe parse single email request (doesn't throw).
 *
 * @param data - Raw request data
 * @returns Zod safe parse result
 */
export function safeParseSingleEmailRequest(data: unknown) {
  return singleEmailRequestSchema.safeParse(data);
}

/**
 * Safe parse bulk email request (doesn't throw).
 *
 * @param data - Raw request data
 * @returns Zod safe parse result
 */
export function safeParseBulkEmailRequest(data: unknown) {
  return bulkEmailRequestSchema.safeParse(data);
}
