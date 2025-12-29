/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';

describe('Security Headers Middleware', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('CORS Headers', () => {
    function createRequest(
      path: string,
      method: string = 'GET',
      headers: Record<string, string> = {}
    ): NextRequest {
      const url = `http://localhost:3000${path}`;
      return new NextRequest(url, {
        method,
        headers: new Headers(headers),
      });
    }

    test('should handle OPTIONS preflight request', () => {
      const request = createRequest('/api/validate', 'OPTIONS', {
        origin: 'http://localhost:3000',
      });

      const response = middleware(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, OPTIONS'
      );
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
        'Content-Type'
      );
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
        'X-API-Key'
      );
    });

    test('should set Vary header for non-wildcard origins', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

      const request = createRequest('/api/validate', 'GET', {
        origin: 'http://localhost:3000',
      });

      const response = middleware(request);

      expect(response.headers.get('Vary')).toBe('Origin');
    });

    test('should expose rate limit headers', () => {
      const request = createRequest('/api/validate', 'GET', {
        origin: 'http://localhost:3000',
      });

      const response = middleware(request);

      const exposedHeaders = response.headers.get('Access-Control-Expose-Headers');
      expect(exposedHeaders).toContain('X-RateLimit-Limit');
      expect(exposedHeaders).toContain('X-RateLimit-Remaining');
      expect(exposedHeaders).toContain('X-RateLimit-Reset');
      expect(exposedHeaders).toContain('Retry-After');
    });

    test('should set max age for preflight caching', () => {
      const request = createRequest('/api/validate', 'OPTIONS', {
        origin: 'http://localhost:3000',
      });

      const response = middleware(request);

      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    test('should not set credentials header with wildcard origin', () => {
      process.env.ALLOWED_ORIGINS = '*';

      const request = createRequest('/api/validate', 'GET', {
        origin: 'http://example.com',
      });

      const response = middleware(request);

      // Should not have credentials with wildcard
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    });

    test('should set credentials header with specific origin', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://example.com';

      const request = createRequest('/api/validate', 'GET', {
        origin: 'http://example.com',
      });

      const response = middleware(request);

      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://example.com'
      );
    });
  });

  describe('Security Headers for API Routes', () => {
    function createRequest(path: string): NextRequest {
      return new NextRequest(`http://localhost:3000${path}`, {
        method: 'GET',
      });
    }

    test('should set X-Content-Type-Options header', () => {
      const request = createRequest('/api/validate');
      const response = middleware(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    test('should set X-Frame-Options header', () => {
      const request = createRequest('/api/validate');
      const response = middleware(request);

      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    test('should set cache control headers for validate endpoint', () => {
      const request = createRequest('/api/validate');
      const response = middleware(request);

      expect(response.headers.get('Cache-Control')).toBe(
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });

    test('should set cache control headers for csp-report endpoint', () => {
      const request = createRequest('/api/csp-report');
      const response = middleware(request);

      expect(response.headers.get('Cache-Control')).toBe(
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
    });
  });

  describe('Origin Validation', () => {
    function createRequest(origin: string): NextRequest {
      return new NextRequest('http://localhost:3000/api/validate', {
        method: 'GET',
        headers: new Headers({ origin }),
      });
    }

    test('should allow configured origins', () => {
      process.env.ALLOWED_ORIGINS = 'http://trusted.com,http://localhost:3000';

      const request = createRequest('http://trusted.com');
      const response = middleware(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://trusted.com'
      );
    });

    test('should not set CORS header for non-allowed origins', () => {
      process.env.ALLOWED_ORIGINS = 'http://trusted.com';
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      const request = createRequest('http://evil.com');
      const response = middleware(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    test('should allow all origins with wildcard', () => {
      process.env.ALLOWED_ORIGINS = '*';

      const request = createRequest('http://any-origin.com');
      const response = middleware(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});

describe('CSP Report Endpoint', () => {
  // Import the route handler
  let POST: (request: NextRequest) => Promise<NextResponse>;
  let GET: () => Promise<NextResponse>;

  beforeAll(async () => {
    const routeModule = await import('@/app/api/csp-report/route');
    POST = routeModule.POST;
    GET = routeModule.GET;
  });

  test('should accept valid CSP report', async () => {
    const report = {
      'csp-report': {
        'document-uri': 'http://localhost:3000/',
        'violated-directive': 'script-src',
        'blocked-uri': 'http://evil.com/script.js',
      },
    };

    const request = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: {
        'content-type': 'application/csp-report',
      },
      body: JSON.stringify(report),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
  });

  test('should accept JSON content type', async () => {
    const report = {
      'csp-report': {
        'document-uri': 'http://localhost:3000/',
        'violated-directive': 'style-src',
      },
    };

    const request = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(report),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
  });

  test('should reject invalid content type', async () => {
    const request = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
      },
      body: 'invalid',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  test('should reject invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: 'not valid json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  test('should reject report without csp-report field', async () => {
    const request = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ invalid: 'report' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  test('GET should return endpoint information', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.endpoint).toBe('/api/csp-report');
    expect(data.method).toBe('POST');
  });
});
