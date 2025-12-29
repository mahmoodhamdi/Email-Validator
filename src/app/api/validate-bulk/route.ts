import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, validateEmailBulk } from '@/lib/validators';
import { RATE_LIMITS, VALIDATION_TIMEOUTS, BULK_CONFIG } from '@/lib/constants';
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
} from '@/lib/rate-limiter';
import { sanitizeEmailArray } from '@/lib/sanitize';
import { parseBulkEmailRequest } from '@/lib/validation-schemas';
import {
  createErrorResponse,
  handleError,
  RateLimitError,
  ParseError,
  ValidationError,
  RequestTimeoutError,
  HTTP_STATUS,
} from '@/lib/errors';
import {
  authenticateRequest,
  createUnauthorizedResponse,
} from '@/lib/security';
import { withTimeout, TimeoutError } from '@/lib/utils/timeout';
import { createBulkJob } from '@/lib/bulk-jobs';

/**
 * POST /api/validate-bulk
 * Validate multiple email addresses in a single request.
 */
export async function POST(request: NextRequest) {
  let rateLimitHeaders: HeadersInit = {};

  try {
    // Authenticate the request (requires 'bulk' permission)
    const auth = authenticateRequest(request, 'bulk');

    if (!auth.authenticated) {
      return createUnauthorizedResponse(
        auth.error || 'Unauthorized',
        auth.errorCode || 'UNAUTHORIZED'
      );
    }

    // Get client identifier for rate limiting
    const clientId = auth.apiKey
      ? `key:${auth.apiKey.key}`
      : getClientIdentifier(request);

    // Calculate bulk rate limit based on tier
    // Bulk operations are more expensive, so we use a fraction of the regular limit
    const bulkRateLimit = Math.max(1, Math.floor(auth.rateLimit / 10));

    // Check rate limit
    const rateLimitResult = checkRateLimit(
      `bulk:${clientId}`,
      bulkRateLimit,
      RATE_LIMITS.bulkValidation.window
    );
    rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    // Override limit header for bulk endpoint
    (rateLimitHeaders as Record<string, string>)['X-RateLimit-Limit'] = String(bulkRateLimit);

    if (!rateLimitResult.allowed) {
      throw new RateLimitError('Rate limit exceeded', rateLimitResult.retryAfter);
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ParseError('Invalid JSON in request body');
    }

    // Validate request schema
    const parseResult = parseBulkEmailRequest(body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error, 'INVALID_REQUEST');
    }

    // Sanitize emails (removes duplicates, empty strings, invalid entries)
    const sanitizeResult = sanitizeEmailArray(
      parseResult.data.emails,
      RATE_LIMITS.maxBulkSize
    );

    if (sanitizeResult.emails.length === 0) {
      throw new ValidationError('No valid emails provided', 'EMPTY_EMAIL_LIST');
    }

    const emails = sanitizeResult.emails;

    // Check if we should use streaming for large batches
    const useStreaming = request.headers.get('accept')?.includes('application/x-ndjson') &&
      emails.length > BULK_CONFIG.streamThreshold;

    // Check if we should use background job for very large batches
    const useBackgroundJob = emails.length > BULK_CONFIG.jobThreshold;

    if (useBackgroundJob) {
      // Create background job and return job ID
      const jobId = createBulkJob(emails);

      return NextResponse.json(
        {
          jobId,
          message: 'Bulk validation started as background job',
          total: emails.length,
          statusUrl: `/api/validate-bulk/jobs/${jobId}`,
          metadata: {
            duplicatesRemoved: sanitizeResult.duplicatesRemoved,
            invalidRemoved: sanitizeResult.invalidRemoved,
          },
        },
        {
          status: 202, // Accepted
          headers: rateLimitHeaders,
        }
      );
    }

    if (useStreaming) {
      // Return streaming response for large batches
      return createStreamingResponse(emails, sanitizeResult, rateLimitHeaders);
    }

    // Standard synchronous response for small batches
    const bulkResult = await withTimeout(
      validateEmailBulk(emails, {
        maxTimeoutMs: VALIDATION_TIMEOUTS.bulkValidation,
      }),
      {
        timeoutMs: VALIDATION_TIMEOUTS.bulkValidation + 1000, // Extra 1s buffer
        errorMessage: `Bulk validation timed out after ${VALIDATION_TIMEOUTS.bulkValidation}ms`,
      }
    );

    // Include metadata about sanitization and processing
    const response = {
      results: bulkResult.results,
      metadata: {
        total: bulkResult.metadata.total,
        completed: bulkResult.metadata.completed,
        duplicatesRemoved: sanitizeResult.duplicatesRemoved,
        invalidRemoved: sanitizeResult.invalidRemoved,
        timedOut: bulkResult.metadata.timedOut,
        processingTimeMs: bulkResult.metadata.processingTimeMs,
      },
    };

    return NextResponse.json(response, { headers: rateLimitHeaders });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return createErrorResponse(error, HTTP_STATUS.TOO_MANY_REQUESTS, rateLimitHeaders);
    }
    if (error instanceof ParseError || error instanceof ValidationError) {
      return createErrorResponse(error, HTTP_STATUS.BAD_REQUEST, rateLimitHeaders);
    }
    if (error instanceof TimeoutError) {
      return createErrorResponse(
        new RequestTimeoutError(error.message, error.timeoutMs),
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        rateLimitHeaders
      );
    }
    return handleError(error, rateLimitHeaders);
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Bulk Email Validation API',
      usage: 'POST /api/validate-bulk with { "emails": ["email1@example.com", "email2@example.com"] }',
      maxEmails: RATE_LIMITS.maxBulkSize,
      streaming: {
        description: 'For batches over 100 emails, set Accept: application/x-ndjson for streaming response',
        threshold: BULK_CONFIG.streamThreshold,
      },
      backgroundJobs: {
        description: 'For batches over 500 emails, a background job is created',
        threshold: BULK_CONFIG.jobThreshold,
        statusEndpoint: '/api/validate-bulk/jobs/{jobId}',
      },
    },
    { status: 200 }
  );
}

/**
 * Create a streaming NDJSON response for large email batches.
 * Each result is sent as a newline-delimited JSON object.
 */
function createStreamingResponse(
  emails: string[],
  sanitizeResult: { duplicatesRemoved: number; invalidRemoved: number },
  headers: HeadersInit
): Response {
  const { batchSize, batchDelayMs } = BULK_CONFIG;
  const startTime = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let completed = 0;

      try {
        // Send initial metadata
        const metadata = {
          type: 'metadata',
          total: emails.length,
          duplicatesRemoved: sanitizeResult.duplicatesRemoved,
          invalidRemoved: sanitizeResult.invalidRemoved,
          streamStarted: new Date().toISOString(),
        };
        controller.enqueue(encoder.encode(JSON.stringify(metadata) + '\n'));

        // Process in batches
        for (let i = 0; i < emails.length; i += batchSize) {
          const batch = emails.slice(i, i + batchSize);

          // Process batch in parallel
          const batchResults = await Promise.all(
            batch.map(async (email) => {
              try {
                return await validateEmail(email);
              } catch {
                return createErrorResult(email);
              }
            })
          );

          // Send each result
          for (const result of batchResults) {
            const resultWithType = { type: 'result', ...result };
            controller.enqueue(encoder.encode(JSON.stringify(resultWithType) + '\n'));
            completed++;
          }

          // Send progress update
          const progress = {
            type: 'progress',
            completed,
            total: emails.length,
            percentComplete: Math.round((completed / emails.length) * 100),
          };
          controller.enqueue(encoder.encode(JSON.stringify(progress) + '\n'));

          // Add delay between batches
          if (i + batchSize < emails.length && batchDelayMs > 0) {
            await delay(batchDelayMs);
          }
        }

        // Send completion message
        const completion = {
          type: 'complete',
          total: emails.length,
          completed,
          processingTimeMs: Date.now() - startTime,
        };
        controller.enqueue(encoder.encode(JSON.stringify(completion) + '\n'));
      } catch (error) {
        const errorMessage = {
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          completed,
        };
        controller.enqueue(encoder.encode(JSON.stringify(errorMessage) + '\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...Object.fromEntries(Object.entries(headers)),
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Create an error result for a failed email validation.
 */
function createErrorResult(email: string): import('@/types/email').ValidationResult {
  return {
    email: email.trim(),
    isValid: false,
    score: 0,
    checks: {
      syntax: { valid: false, message: 'Validation error' },
      domain: { valid: false, exists: false, message: 'Skipped' },
      mx: { valid: false, records: [], message: 'Skipped' },
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
