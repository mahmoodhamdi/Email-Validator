/**
 * Webhook API Routes
 *
 * API endpoints for webhook management documentation.
 * Note: Actual webhook management is done client-side via the Zustand store.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

const createWebhookSchema = z.object({
  url: z.string().url('Invalid URL format'),
  events: z
    .array(
      z.enum([
        'validation.complete',
        'validation.failed',
        'bulk.complete',
        'bulk.progress',
      ])
    )
    .min(1, 'At least one event is required'),
  description: z.string().optional(),
});

/**
 * POST /api/webhooks
 *
 * Create a new webhook (example endpoint for API documentation)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createWebhookSchema.parse(body);

    // Generate webhook credentials
    const id = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const webhook = {
      id,
      url: validated.url,
      events: validated.events,
      secret,
      description: validated.description,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failureCount: 0,
    };

    return NextResponse.json({
      success: true,
      message: 'Webhook created successfully',
      webhook: {
        ...webhook,
        // Only show secret once on creation
        secret: webhook.secret,
      },
      note: 'Store the secret securely - it will not be shown again',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks
 *
 * Get webhook documentation
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Webhook API',
    documentation: {
      overview:
        'Webhooks allow you to receive notifications when validation events occur.',
      events: [
        {
          name: 'validation.complete',
          description: 'Triggered when a single email validation completes',
          payload: {
            event: 'validation.complete',
            timestamp: 'ISO 8601 timestamp',
            data: {
              email: 'The validated email address',
              result: {
                valid: 'boolean',
                score: 'number (0-100)',
                deliverability: 'deliverable | risky | undeliverable | unknown',
                risk: 'low | medium | high',
              },
              validatedAt: 'ISO 8601 timestamp',
            },
          },
        },
        {
          name: 'validation.failed',
          description: 'Triggered when a validation fails with an error',
          payload: {
            event: 'validation.failed',
            timestamp: 'ISO 8601 timestamp',
            data: {
              email: 'The email address that failed validation',
              error: 'Error message',
              failedAt: 'ISO 8601 timestamp',
            },
          },
        },
        {
          name: 'bulk.complete',
          description: 'Triggered when a bulk validation batch completes',
          payload: {
            event: 'bulk.complete',
            timestamp: 'ISO 8601 timestamp',
            data: {
              batchId: 'Unique batch identifier',
              totalEmails: 'number',
              validCount: 'number',
              invalidCount: 'number',
              completedAt: 'ISO 8601 timestamp',
            },
          },
        },
        {
          name: 'bulk.progress',
          description: 'Triggered periodically during bulk validation',
          payload: {
            event: 'bulk.progress',
            timestamp: 'ISO 8601 timestamp',
            data: {
              batchId: 'Unique batch identifier',
              totalEmails: 'number',
              processedEmails: 'number',
              progress: 'number (0-100)',
            },
          },
        },
      ],
      security: {
        description: 'All webhook requests are signed using HMAC-SHA256',
        headers: {
          'X-Webhook-Signature': 'HMAC signature in format v1=<hex>',
          'X-Webhook-Timestamp': 'Unix timestamp in milliseconds',
        },
        verification: [
          '1. Concatenate timestamp and payload: `${timestamp}.${payload}`',
          '2. Compute HMAC-SHA256 using your webhook secret',
          '3. Compare with signature from header (use constant-time comparison)',
          '4. Reject if timestamp is older than 5 minutes',
        ],
      },
      retries: {
        description: 'Failed webhooks are retried with exponential backoff',
        maxRetries: 3,
        delays: ['1 second', '2 seconds', '4 seconds'],
      },
    },
  });
}
