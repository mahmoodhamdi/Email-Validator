/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/validate-bulk/route';

// Mock the validators module
jest.mock('@/lib/validators', () => ({
  validateEmailBulk: jest.fn((emails: string[]) =>
    Promise.resolve(
      emails.map((email) => ({
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
      }))
    )
  ),
}));

describe('POST /api/validate-bulk', () => {
  test('should validate multiple emails successfully', async () => {
    const emails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(3);
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

  test('should deduplicate emails', async () => {
    const emails = ['test@example.com', 'test@example.com', 'test@example.com'];
    const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.length).toBe(1);
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
