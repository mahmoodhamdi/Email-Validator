/**
 * Authentication Middleware
 * Handles API key validation and request authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateAPIKey,
  isSameOriginRequest,
  getAPIKeyRateLimit,
  type APIKey,
  type APIKeyPermission,
} from './api-keys';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * Authentication result returned by the auth check.
 */
export interface AuthResult {
  authenticated: boolean;
  apiKey?: APIKey;
  rateLimit: number;
  error?: string;
  errorCode?: string;
}

/**
 * Authentication error for unauthorized requests.
 */
export class AuthenticationError extends Error {
  public readonly statusCode: number = HTTP_STATUS.UNAUTHORIZED;
  public readonly code: string;

  constructor(message: string, code: string = 'UNAUTHORIZED') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

/**
 * Check if API key authentication is required.
 */
export function isAuthRequired(): boolean {
  return process.env.API_KEY_REQUIRED === 'true';
}

/**
 * Get API key from request headers.
 */
export function getAPIKeyFromRequest(request: Request): string | null {
  // Check X-API-Key header (preferred)
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return apiKey;
  }

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check query parameter (less secure, but useful for testing)
  if (request.url) {
    try {
      const url = new URL(request.url);
      const queryKey = url.searchParams.get('api_key');
      if (queryKey) {
        return queryKey;
      }
    } catch {
      // Invalid URL
    }
  }

  return null;
}

/**
 * Authenticate a request.
 *
 * @param request - The incoming request
 * @param requiredPermission - Optional permission required for this endpoint
 * @returns Authentication result
 */
export function authenticateRequest(
  request: Request,
  requiredPermission?: APIKeyPermission
): AuthResult {
  const apiKeyRequired = isAuthRequired();
  const apiKey = getAPIKeyFromRequest(request);

  // If API key provided, validate it
  if (apiKey) {
    const validationResult = validateAPIKey(apiKey, requiredPermission);

    if (!validationResult.valid) {
      return {
        authenticated: false,
        rateLimit: 20, // Anonymous rate limit
        error: validationResult.error,
        errorCode: validationResult.errorCode,
      };
    }

    return {
      authenticated: true,
      apiKey: validationResult.key,
      rateLimit: getAPIKeyRateLimit(validationResult.key),
    };
  }

  // No API key provided
  if (apiKeyRequired) {
    // Check if same-origin request (frontend)
    if (isSameOriginRequest(request)) {
      return {
        authenticated: true,
        rateLimit: 100, // Frontend rate limit
      };
    }

    // External request without API key
    return {
      authenticated: false,
      rateLimit: 20,
      error: 'API key is required for external requests',
      errorCode: 'MISSING_KEY',
    };
  }

  // API key not required
  return {
    authenticated: true,
    rateLimit: isSameOriginRequest(request) ? 100 : 20,
  };
}

/**
 * Create an unauthorized response.
 */
export function createUnauthorizedResponse(
  error: string,
  errorCode: string = 'UNAUTHORIZED',
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(
    {
      error,
      code: errorCode,
    },
    {
      status: HTTP_STATUS.UNAUTHORIZED,
      headers: {
        ...headers,
        'WWW-Authenticate': 'Bearer realm="API", error="invalid_token"',
      },
    }
  );
}

/**
 * Higher-order function to wrap API route handlers with authentication.
 *
 * @param handler - The route handler function
 * @param requiredPermission - Optional permission required
 * @returns Wrapped handler with authentication
 */
export function withAuth<T extends NextRequest>(
  handler: (
    request: T,
    context: { auth: AuthResult }
  ) => Promise<NextResponse> | NextResponse,
  requiredPermission?: APIKeyPermission
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    const auth = authenticateRequest(request, requiredPermission);

    if (!auth.authenticated) {
      return createUnauthorizedResponse(
        auth.error || 'Unauthorized',
        auth.errorCode || 'UNAUTHORIZED'
      );
    }

    return handler(request, { auth });
  };
}

/**
 * Type for authenticated request context.
 */
export interface AuthContext {
  auth: AuthResult;
}
