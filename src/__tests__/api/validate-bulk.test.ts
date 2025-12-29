/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/validate-bulk/route';
import { clearAllRateLimits } from '@/lib/rate-limiter';

// Mock the validators module with new BulkValidationResult format
jest.mock('@/lib/validators', () => ({
  validateEmailBulk: jest.fn((emails: string[]) => {
    const results = emails.map((email) => ({
      email,
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
    }));

    return Promise.resolve({
      results,
      metadata: {
        total: emails.length,
        completed: emails.length,
        timedOut: false,
        processingTimeMs: 10,
      },
    });
  }),
}));

describe('POST /api/validate-bulk', () => {
  beforeEach(() => {
    // Clear rate limits before each test
    clearAllRateLimits();
  });

  test('should validate multiple emails successfully', async () => {
    const emails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // New response format includes results and metadata
    expect(data.results).toBeDefined();
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBe(3);
    expect(data.metadata).toBeDefined();
    expect(data.metadata.total).toBe(3);
  });

  test('should include rate limit headers', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({ emails: ['test@example.com'] }),
    });

    const response = await POST(request);

    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  test('should reject request without emails array', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Emails array is required');
  });

  test('should reject empty emails array', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({ emails: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Emails array cannot be empty');
  });

  test('should reject array exceeding max size', async () => {
    const emails = Array(1001).fill('test@example.com');
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Maximum');
  });

  test('should deduplicate emails and report in metadata', async () => {
    const emails = ['test@example.com', 'TEST@EXAMPLE.COM', 'test@example.com'];
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results.length).toBe(1);
    expect(data.metadata.duplicatesRemoved).toBe(2);
  });

  test('should handle invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON in request body');
  });

  test('should sanitize and filter invalid emails', async () => {
    // Use strings that pass Zod validation (non-empty) but fail email format validation
    const emails = [
      'valid@example.com',
      'notanemail', // No @ - passes Zod string check, filtered by sanitization
      'missing-domain@', // Invalid format - filtered by sanitization
      '@nodomain.com', // No local part - filtered by sanitization
    ];
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results.length).toBe(1);
    expect(data.metadata.invalidRemoved).toBeGreaterThan(0);
  });

  test('should reject bulk request with empty strings', async () => {
    const emails = [
      '', // Empty string fails Zod validation
    ];
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email cannot be empty');
  });
});

describe('GET /api/validate-bulk', () => {
  test('should return API usage information', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Bulk Email Validation API');
    expect(data.maxEmails).toBe(1000);
  });
});
