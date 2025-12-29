import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * CORS configuration loaded from environment.
 */
interface CorsConfig {
  allowedOrigins: string[];
  allowCredentials: boolean;
  maxAge: number;
}

/**
 * Get CORS configuration from environment.
 */
function getCorsConfig(): CorsConfig {
  const originsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = originsEnv
    ? originsEnv.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  // In development, allow localhost by default
  if (process.env.NODE_ENV === 'development' && allowedOrigins.length === 0) {
    allowedOrigins.push('http://localhost:3000');
  }

  return {
    allowedOrigins,
    // Only allow credentials if we have specific origins (not wildcard)
    allowCredentials: allowedOrigins.length > 0 && !allowedOrigins.includes('*'),
    maxAge: 86400, // 24 hours
  };
}

/**
 * Check if origin is allowed.
 */
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) {
    // No allowed origins configured - allow all in development
    return process.env.NODE_ENV === 'development';
  }

  if (allowedOrigins.includes('*')) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

/**
 * Set CORS headers on response.
 */
function setCorsHeaders(
  response: NextResponse,
  origin: string,
  config: CorsConfig
): void {
  const { allowedOrigins, allowCredentials, maxAge } = config;

  // Determine the Access-Control-Allow-Origin value
  if (isOriginAllowed(origin, allowedOrigins)) {
    if (allowedOrigins.includes('*')) {
      // Wildcard - cannot use with credentials
      response.headers.set('Access-Control-Allow-Origin', '*');
    } else if (origin) {
      // Specific origin
      response.headers.set('Access-Control-Allow-Origin', origin);
      // Vary header for caching
      response.headers.set('Vary', 'Origin');
    }
  }

  // Allowed methods
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  // Allowed headers
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key, X-Requested-With'
  );

  // Exposed headers (headers the client can access)
  response.headers.set(
    'Access-Control-Expose-Headers',
    'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After'
  );

  // Max age for preflight cache
  response.headers.set('Access-Control-Max-Age', String(maxAge));

  // Credentials - only if not using wildcard
  if (allowCredentials && !allowedOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}

/**
 * Middleware for handling CORS and security headers on API routes.
 */
export function middleware(request: NextRequest) {
  const corsConfig = getCorsConfig();
  const origin = request.headers.get('origin') || '';

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    setCorsHeaders(response, origin, corsConfig);
    return response;
  }

  // Get the response
  const response = NextResponse.next();

  // Set CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    setCorsHeaders(response, origin, corsConfig);

    // Add security headers for API responses
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');

    // Prevent caching of API responses with sensitive data
    if (
      request.nextUrl.pathname.startsWith('/api/validate') ||
      request.nextUrl.pathname.startsWith('/api/csp-report')
    ) {
      response.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
  }

  return response;
}

/**
 * Configure middleware to run only on API routes.
 */
export const config = {
  matcher: '/api/:path*',
};
