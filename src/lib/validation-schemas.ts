/**
 * Zod validation schemas for API request validation.
 * Provides type-safe request parsing and validation.
 */

import { z } from 'zod';
import { MAX_EMAIL_LENGTH, RATE_LIMITS } from './constants';

/**
 * Schema for single email validation request.
 */
export const singleEmailRequestSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .min(1, 'Email cannot be empty')
    .max(MAX_EMAIL_LENGTH, `Email exceeds maximum length of ${MAX_EMAIL_LENGTH} characters`)
    .transform((val) => val.trim().toLowerCase()),
});

/**
 * Schema for bulk email validation request.
 */
export const bulkEmailRequestSchema = z.object({
  emails: z
    .array(
      z
        .string()
        .max(MAX_EMAIL_LENGTH, `Email exceeds maximum length of ${MAX_EMAIL_LENGTH} characters`),
      {
        required_error: 'Emails array is required',
        invalid_type_error: 'Emails must be an array',
      }
    )
    .min(1, 'Emails array cannot be empty')
    .max(
      RATE_LIMITS.maxBulkSize,
      `Maximum ${RATE_LIMITS.maxBulkSize} emails allowed per request`
    ),
});

/**
 * Type for validated single email request.
 */
export type SingleEmailRequest = z.infer<typeof singleEmailRequestSchema>;

/**
 * Type for validated bulk email request.
 */
export type BulkEmailRequest = z.infer<typeof bulkEmailRequestSchema>;

/**
 * Parse and validate single email request.
 *
 * @param data - Raw request data
 * @returns Validated request data or error
 */
export function parseSingleEmailRequest(data: unknown): {
  success: true;
  data: SingleEmailRequest;
} | {
  success: false;
  error: string;
} {
  try {
    const result = singleEmailRequestSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { success: false, error: firstError.message };
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
export function parseBulkEmailRequest(data: unknown): {
  success: true;
  data: BulkEmailRequest;
} | {
  success: false;
  error: string;
} {
  try {
    const result = bulkEmailRequestSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: 'Invalid request data' };
  }
}
