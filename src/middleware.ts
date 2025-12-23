import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for handling CORS and security headers on API routes.
 */
export function middleware(request: NextRequest) {
  // Get allowed origins from environment or default to all for development
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : ['*'];

  const origin = request.headers.get('origin') || '';

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });

    // Set CORS headers
    setCorsHeaders(response, origin, allowedOrigins);

    return response;
  }

  // Get the response
  const response = NextResponse.next();

  // Set CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    setCorsHeaders(response, origin, allowedOrigins);
  }

  return response;
}

/**
 * Set CORS headers on response.
 */
function setCorsHeaders(
  response: NextResponse,
  origin: string,
  allowedOrigins: string[]
): void {
  // Check if origin is allowed
  const isAllowed =
    allowedOrigins.includes('*') || allowedOrigins.includes(origin);

  if (isAllowed) {
    response.headers.set(
      'Access-Control-Allow-Origin',
      allowedOrigins.includes('*') ? '*' : origin
    );
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key'
  );
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  response.headers.set('Access-Control-Allow-Credentials', 'true');
}

/**
 * Configure middleware to run only on API routes.
 */
export const config = {
  matcher: '/api/:path*',
};
