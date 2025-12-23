/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/validate/route';
import { clearAllRateLimits } from '@/lib/rate-limiter';

// Mock the validators
jest.mock('@/lib/validators', () => ({
  validateEmail: jest.fn().mockResolvedValue({
    email: 'test@example.com',
    isValid: true,
    score: 85,
    checks: {
      syntax: { valid: true, message: 'Valid' },
      domain: { valid: true, exists: true, message: 'Valid' },
      mx: { valid: true, records: ['mx.example.com'], message: 'Found' },
      disposable: { isDisposable: false, message: 'Not disposable' },
      roleBased: { isRoleBased: false, role: null },
      freeProvider: { isFree: false, provider: null },
      typo: { hasTypo: false, suggestion: null },
      blacklisted: { isBlacklisted: false, lists: [] },
      catchAll: { isCatchAll: false },
    },
    deliverability: 'deliverable',
    risk: 'low',
    timestamp: new Date().toISOString(),
  }),
}));

describe('POST /api/validate', () => {
  beforeEach(() => {
    // Clear rate limits before each test
    clearAllRateLimits();
  });

  test('should validate email successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email).toBe('test@example.com');
    expect(data.isValid).toBe(true);
  });

  test('should include rate limit headers', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);

    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  test('should reject request without email', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email is required');
  });

  test('should reject empty email', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate', {
      method: 'POST',
      body: JSON.stringify({ email: '   ' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email cannot be empty');
  });

  test('should reject email exceeding max length', async () => {
    const longEmail = 'a'.repeat(300) + '@example.com';
    const request = new NextRequest('http://localhost:3000/api/validate', {
      method: 'POST',
      body: JSON.stringify({ email: longEmail }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('exceeds maximum length');
  });

  test('should trim whitespace from email', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate', {
      method: 'POST',
      body: JSON.stringify({ email: '  test@example.com  ' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email).toBe('test@example.com');
  });

  test('should handle invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON in request body');
  });

  test('should sanitize email input', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate', {
      method: 'POST',
      body: JSON.stringify({ email: 'TEST@EXAMPLE.COM' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Email should be lowercase after sanitization
    expect(data.email).toBe('test@example.com');
  });
});

describe('GET /api/validate', () => {
  test('should return API usage information', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Email Validation API');
    expect(data.usage).toContain('POST /api/validate');
  });
});
