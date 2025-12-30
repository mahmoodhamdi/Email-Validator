/**
 * Tests for Webhook module
 */

import {
  generateSignature,
  verifySignature,
  getSignatureHeaders,
  parseSignature,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
} from '@/lib/webhooks/signature';
import { sendWebhook, broadcastWebhook } from '@/lib/webhooks/sender';
import type { Webhook, WebhookPayload } from '@/lib/webhooks/types';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Webhook Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Signature', () => {
    const secret = 'test-secret-key';
    const payload = '{"test":"data"}';
    const timestamp = 1700000000000;

    describe('generateSignature', () => {
      it('should generate consistent signatures', () => {
        const sig1 = generateSignature(payload, secret, timestamp);
        const sig2 = generateSignature(payload, secret, timestamp);

        expect(sig1).toBe(sig2);
      });

      it('should generate signature in correct format', () => {
        const sig = generateSignature(payload, secret, timestamp);

        expect(sig).toMatch(/^v1=[a-f0-9]{64}$/);
      });

      it('should generate different signatures for different payloads', () => {
        const sig1 = generateSignature('payload1', secret, timestamp);
        const sig2 = generateSignature('payload2', secret, timestamp);

        expect(sig1).not.toBe(sig2);
      });

      it('should generate different signatures for different secrets', () => {
        const sig1 = generateSignature(payload, 'secret1', timestamp);
        const sig2 = generateSignature(payload, 'secret2', timestamp);

        expect(sig1).not.toBe(sig2);
      });

      it('should generate different signatures for different timestamps', () => {
        const sig1 = generateSignature(payload, secret, 1000);
        const sig2 = generateSignature(payload, secret, 2000);

        expect(sig1).not.toBe(sig2);
      });
    });

    describe('verifySignature', () => {
      it('should verify valid signature', () => {
        const signature = generateSignature(payload, secret, timestamp);
        const isValid = verifySignature(payload, signature, secret, timestamp, Infinity);

        expect(isValid).toBe(true);
      });

      it('should reject invalid signature', () => {
        const isValid = verifySignature(payload, 'v1=invalid', secret, timestamp, Infinity);

        expect(isValid).toBe(false);
      });

      it('should reject signature with wrong payload', () => {
        const signature = generateSignature(payload, secret, timestamp);
        const isValid = verifySignature('wrong-payload', signature, secret, timestamp, Infinity);

        expect(isValid).toBe(false);
      });

      it('should reject signature with wrong secret', () => {
        const signature = generateSignature(payload, secret, timestamp);
        const isValid = verifySignature(payload, signature, 'wrong-secret', timestamp, Infinity);

        expect(isValid).toBe(false);
      });

      it('should reject expired timestamp', () => {
        const oldTimestamp = Date.now() - 600000; // 10 minutes ago
        const signature = generateSignature(payload, secret, oldTimestamp);
        const isValid = verifySignature(payload, signature, secret, oldTimestamp, 300000);

        expect(isValid).toBe(false);
      });

      it('should accept timestamp within tolerance', () => {
        const recentTimestamp = Date.now() - 60000; // 1 minute ago
        const signature = generateSignature(payload, secret, recentTimestamp);
        const isValid = verifySignature(payload, signature, secret, recentTimestamp, 300000);

        expect(isValid).toBe(true);
      });

      it('should reject signatures of different length', () => {
        const isValid = verifySignature(payload, 'v1=short', secret, timestamp, Infinity);

        expect(isValid).toBe(false);
      });
    });

    describe('getSignatureHeaders', () => {
      it('should return signature and timestamp headers', () => {
        const headers = getSignatureHeaders(payload, secret);

        expect(headers[SIGNATURE_HEADER]).toMatch(/^v1=[a-f0-9]{64}$/);
        expect(headers[TIMESTAMP_HEADER]).toMatch(/^\d+$/);
      });

      it('should generate verifiable signature', () => {
        const headers = getSignatureHeaders(payload, secret);
        const signature = headers[SIGNATURE_HEADER];
        const timestamp = parseInt(headers[TIMESTAMP_HEADER], 10);

        const isValid = verifySignature(payload, signature, secret, timestamp, Infinity);
        expect(isValid).toBe(true);
      });
    });

    describe('parseSignature', () => {
      it('should parse valid signature', () => {
        const result = parseSignature('v1=abc123def456');

        expect(result).toEqual({
          version: 'v1',
          signature: 'abc123def456',
        });
      });

      it('should return null for invalid format', () => {
        expect(parseSignature('invalid')).toBeNull();
        expect(parseSignature('v1=')).toBeNull();
        expect(parseSignature('=abc123')).toBeNull();
        expect(parseSignature('')).toBeNull();
      });
    });
  });

  describe('Sender', () => {
    const webhook: Webhook = {
      id: 'test-webhook',
      url: 'https://example.com/webhook',
      secret: 'test-secret',
      events: ['validation.complete'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      failureCount: 0,
    };

    const payload: WebhookPayload = {
      event: 'validation.complete',
      timestamp: new Date().toISOString(),
      data: {
        email: 'test@example.com',
        result: {
          valid: true,
          score: 95,
          deliverability: 'deliverable',
          risk: 'low',
        },
        validatedAt: new Date().toISOString(),
      },
    };

    describe('sendWebhook', () => {
      it('should send webhook successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK'),
        });

        const delivery = await sendWebhook(webhook, payload, { maxRetries: 0 });

        expect(delivery.status).toBe('success');
        expect(delivery.responseStatus).toBe(200);
        expect(delivery.attempts).toBe(1);
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should include correct headers', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK'),
        });

        await sendWebhook(webhook, payload, { maxRetries: 0 });

        const call = mockFetch.mock.calls[0];
        const headers = call[1].headers;

        expect(headers['Content-Type']).toBe('application/json');
        expect(headers['User-Agent']).toBe('EmailValidator-Webhook/1.0');
        expect(headers[SIGNATURE_HEADER]).toMatch(/^v1=/);
        expect(headers[TIMESTAMP_HEADER]).toBeTruthy();
      });

      it('should retry on failure', async () => {
        mockFetch
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: () => Promise.resolve('OK'),
          });

        const delivery = await sendWebhook(webhook, payload, {
          maxRetries: 1,
          retryDelayMs: 10,
        });

        expect(delivery.status).toBe('success');
        expect(delivery.attempts).toBe(2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should mark as failed after max retries', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const delivery = await sendWebhook(webhook, payload, {
          maxRetries: 2,
          retryDelayMs: 10,
        });

        expect(delivery.status).toBe('failed');
        expect(delivery.attempts).toBe(3);
        expect(delivery.error).toBe('Network error');
      });

      it('should handle non-2xx responses', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        });

        const delivery = await sendWebhook(webhook, payload, {
          maxRetries: 0,
        });

        expect(delivery.status).toBe('failed');
        expect(delivery.responseStatus).toBe(500);
        expect(delivery.error).toBe('HTTP 500');
      });

      it('should handle timeout', async () => {
        mockFetch.mockImplementationOnce(
          () =>
            new Promise((_, reject) => {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              setTimeout(() => reject(error), 50);
            })
        );

        const delivery = await sendWebhook(webhook, payload, {
          maxRetries: 0,
          timeoutMs: 10,
        });

        expect(delivery.status).toBe('failed');
        expect(delivery.error).toBe('Request timed out');
      });

      it('should truncate long response body', async () => {
        const longResponse = 'x'.repeat(1000);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(longResponse),
        });

        const delivery = await sendWebhook(webhook, payload, { maxRetries: 0 });

        expect(delivery.responseBody?.length).toBeLessThanOrEqual(500);
      });
    });

    describe('broadcastWebhook', () => {
      it('should send to all active webhooks with matching event', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          text: () => Promise.resolve('OK'),
        });

        const webhooks: Webhook[] = [
          { ...webhook, id: 'wh1', events: ['validation.complete'] },
          { ...webhook, id: 'wh2', events: ['validation.complete'] },
          { ...webhook, id: 'wh3', events: ['bulk.complete'] }, // Different event
          { ...webhook, id: 'wh4', events: ['validation.complete'], isActive: false }, // Inactive
        ];

        const deliveries = await broadcastWebhook(webhooks, payload);

        expect(deliveries).toHaveLength(2);
        expect(deliveries.every((d) => d.status === 'success')).toBe(true);
      });

      it('should return empty array if no matching webhooks', async () => {
        const webhooks: Webhook[] = [
          { ...webhook, events: ['bulk.complete'] },
        ];

        const deliveries = await broadcastWebhook(webhooks, payload);

        expect(deliveries).toHaveLength(0);
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('Payload Helpers', () => {
    it('should create validation complete payload', async () => {
      const { createValidationCompletePayload } = await import('@/lib/webhooks/sender');

      const payload = createValidationCompletePayload('test@example.com', {
        valid: true,
        score: 95,
        deliverability: 'deliverable',
        risk: 'low',
      });

      expect(payload.event).toBe('validation.complete');
      expect(payload.timestamp).toBeDefined();
      expect(payload.data).toMatchObject({
        email: 'test@example.com',
        result: {
          valid: true,
          score: 95,
        },
      });
    });

    it('should create validation failed payload', async () => {
      const { createValidationFailedPayload } = await import('@/lib/webhooks/sender');

      const payload = createValidationFailedPayload('test@example.com', 'Invalid syntax');

      expect(payload.event).toBe('validation.failed');
      expect(payload.data).toMatchObject({
        email: 'test@example.com',
        error: 'Invalid syntax',
      });
    });

    it('should create bulk complete payload', async () => {
      const { createBulkCompletePayload } = await import('@/lib/webhooks/sender');

      const payload = createBulkCompletePayload('batch-123', 100, 90, 10);

      expect(payload.event).toBe('bulk.complete');
      expect(payload.data).toMatchObject({
        batchId: 'batch-123',
        totalEmails: 100,
        validCount: 90,
        invalidCount: 10,
      });
    });

    it('should create bulk progress payload', async () => {
      const { createBulkProgressPayload } = await import('@/lib/webhooks/sender');

      const payload = createBulkProgressPayload('batch-123', 100, 50);

      expect(payload.event).toBe('bulk.progress');
      expect(payload.data).toMatchObject({
        batchId: 'batch-123',
        totalEmails: 100,
        processedEmails: 50,
        progress: 50,
      });
    });
  });
});
