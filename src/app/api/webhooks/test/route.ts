/**
 * Webhook Test API Route
 *
 * Endpoint for testing webhook delivery.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWebhook } from '@/lib/webhooks/sender';
import type { Webhook, WebhookPayload, WebhookEventType } from '@/lib/webhooks/types';

/**
 * POST /api/webhooks/test
 *
 * Send a test webhook to verify endpoint configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, secret, event } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'Secret is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create test webhook configuration
    const testWebhook: Webhook = {
      id: 'test',
      url,
      secret,
      events: [(event as WebhookEventType) || 'validation.complete'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      failureCount: 0,
    };

    // Create test payload
    const testPayload: WebhookPayload = {
      event: (event as WebhookEventType) || 'validation.complete',
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

    // Send test webhook (no retries for testing)
    const delivery = await sendWebhook(testWebhook, testPayload, {
      maxRetries: 0,
      timeoutMs: 5000,
    });

    return NextResponse.json({
      success: delivery.status === 'success',
      delivery: {
        id: delivery.id,
        status: delivery.status,
        attempts: delivery.attempts,
        responseStatus: delivery.responseStatus,
        responseBody: delivery.responseBody?.substring(0, 200),
        error: delivery.error,
      },
      message:
        delivery.status === 'success'
          ? 'Webhook delivered successfully'
          : `Webhook delivery failed: ${delivery.error}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      },
      { status: 500 }
    );
  }
}
