import { NextRequest, NextResponse } from 'next/server';
import { validateEmailBulk } from '@/lib/validators';
import { RATE_LIMITS } from '@/lib/constants';
import {
  checkBulkValidationLimit,
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
  HTTP_STATUS,
} from '@/lib/errors';

/**
 * POST /api/validate-bulk
 * Validate multiple email addresses in a single request.
 */
export async function POST(request: NextRequest) {
  let rateLimitHeaders: HeadersInit = {};

  try {
    // Get client identifier for rate limiting
    const clientId = getClientIdentifier(request);

    // Check rate limit
    const rateLimitResult = checkBulkValidationLimit(clientId);
    rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    // Override limit header for bulk endpoint
    (rateLimitHeaders as Record<string, string>)['X-RateLimit-Limit'] = String(RATE_LIMITS.bulkValidation.max);

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

    // Validate emails
    const results = await validateEmailBulk(sanitizeResult.emails);

    // Include metadata about sanitization
    const response = {
      results,
      metadata: {
        total: sanitizeResult.emails.length,
        duplicatesRemoved: sanitizeResult.duplicatesRemoved,
        invalidRemoved: sanitizeResult.invalidRemoved,
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
    return handleError(error, rateLimitHeaders);
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Bulk Email Validation API',
      usage: 'POST /api/validate-bulk with { "emails": ["email1@example.com", "email2@example.com"] }',
      maxEmails: RATE_LIMITS.maxBulkSize,
    },
    { status: 200 }
  );
}
