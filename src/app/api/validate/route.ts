import { NextRequest, NextResponse } from 'next/server';
import { validateEmail } from '@/lib/validators';
import {
  checkSingleValidationLimit,
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
  HTTP_STATUS,
} from '@/lib/errors';

/**
 * POST /api/validate
 * Validate a single email address.
 */
export async function POST(request: NextRequest) {
  let rateLimitHeaders: HeadersInit = {};

  try {
    // Get client identifier for rate limiting
    const clientId = getClientIdentifier(request);

    // Check rate limit
    const rateLimitResult = checkSingleValidationLimit(clientId);
    rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

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

    // Validate email
    const result = await validateEmail(sanitizedEmail);

    return NextResponse.json(result, { headers: rateLimitHeaders });
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
      message: 'Email Validation API',
      usage: 'POST /api/validate with { "email": "test@example.com" }',
    },
    { status: 200 }
  );
}
