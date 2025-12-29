import { NextRequest, NextResponse } from 'next/server';
import { validateEmail } from '@/lib/validators';
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
} from '@/lib/rate-limiter';
import { sanitizeEmail } from '@/lib/sanitize';
import { parseSingleEmailRequest } from '@/lib/validation-schemas';
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
import { RATE_LIMITS, VALIDATION_TIMEOUTS } from '@/lib/constants';
import { withTimeout, TimeoutError } from '@/lib/utils/timeout';

/**
 * POST /api/validate
 * Validate a single email address.
 */
export async function POST(request: NextRequest) {
  let rateLimitHeaders: HeadersInit = {};

  try {
    // Authenticate the request
    const auth = authenticateRequest(request, 'validate');

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

    // Use the rate limit from auth (based on API key tier)
    const rateLimit = auth.rateLimit;

    // Check rate limit
    const rateLimitResult = checkRateLimit(
      `single:${clientId}`,
      rateLimit,
      RATE_LIMITS.singleValidation.window
    );
    rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    // Override the limit header with actual limit
    (rateLimitHeaders as Record<string, string>)['X-RateLimit-Limit'] = String(rateLimit);

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
    const parseResult = parseSingleEmailRequest(body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error, 'INVALID_REQUEST');
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(parseResult.data.email);

    if (!sanitizedEmail) {
      throw new ValidationError('Email cannot be empty', 'EMPTY_EMAIL');
    }

    // Determine timeout based on whether SMTP check is enabled
    const timeout = parseResult.data.smtpCheck
      ? VALIDATION_TIMEOUTS.singleValidation + 15000 // Extra time for SMTP
      : VALIDATION_TIMEOUTS.singleValidation;

    // Validate email with timeout
    const result = await withTimeout(
      validateEmail(sanitizedEmail, { smtpCheck: parseResult.data.smtpCheck }),
      {
        timeoutMs: timeout,
        errorMessage: `Validation timed out after ${timeout}ms`,
      }
    );

    return NextResponse.json(result, { headers: rateLimitHeaders });
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
      message: 'Email Validation API',
      usage: 'POST /api/validate with { "email": "test@example.com" }',
    },
    { status: 200 }
  );
}
