/**
 * Webhook Sender
 *
 * Sends webhook payloads with retry logic and exponential backoff.
 */

import type {
  Webhook,
  WebhookPayload,
  WebhookDelivery,
  WebhookConfig,
} from './types';
import { DEFAULT_WEBHOOK_CONFIG } from './types';
import { getSignatureHeaders } from './signature';

/**
 * Send webhook with retry logic
 *
 * @param webhook - Webhook configuration
 * @param payload - Payload to send
 * @param config - Optional configuration overrides
 * @returns Delivery result
 */
export async function sendWebhook(
  webhook: Webhook,
  payload: WebhookPayload,
  config: Partial<WebhookConfig> = {}
): Promise<WebhookDelivery> {
  const fullConfig = { ...DEFAULT_WEBHOOK_CONFIG, ...config };
  const payloadString = JSON.stringify(payload);
  const deliveryId = generateDeliveryId();

  const delivery: WebhookDelivery = {
    id: deliveryId,
    webhookId: webhook.id,
    event: payload.event,
    payload,
    status: 'pending',
    attempts: 0,
    createdAt: new Date(),
  };

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      delivery.attempts++;
      delivery.lastAttemptAt = new Date();

      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'EmailValidator-Webhook/1.0',
        ...getSignatureHeaders(payloadString, webhook.secret),
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fullConfig.timeoutMs);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      delivery.responseStatus = response.status;

      if (response.ok) {
        delivery.status = 'success';
        try {
          const text = await response.text();
          delivery.responseBody = text.substring(0, 500); // Truncate response
        } catch {
          delivery.responseBody = '';
        }
        return delivery;
      }

      // Non-2xx response
      delivery.error = `HTTP ${response.status}`;
      try {
        const text = await response.text();
        delivery.responseBody = text.substring(0, 500);
      } catch {
        delivery.responseBody = '';
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          delivery.error = 'Request timed out';
        } else {
          delivery.error = error.message;
        }
      } else {
        delivery.error = 'Unknown error';
      }
    }

    // Wait before retry (exponential backoff)
    if (attempt < fullConfig.maxRetries) {
      const delay = fullConfig.retryDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  delivery.status = 'failed';
  return delivery;
}

/**
 * Send to multiple webhooks that subscribe to an event
 *
 * @param webhooks - Array of webhooks
 * @param payload - Payload to send
 * @param config - Optional configuration overrides
 * @returns Array of delivery results
 */
export async function broadcastWebhook(
  webhooks: Webhook[],
  payload: WebhookPayload,
  config: Partial<WebhookConfig> = {}
): Promise<WebhookDelivery[]> {
  // Filter to active webhooks that subscribe to this event
  const activeWebhooks = webhooks.filter(
    (w) => w.isActive && w.events.includes(payload.event)
  );

  if (activeWebhooks.length === 0) {
    return [];
  }

  // Send to all webhooks in parallel
  const deliveries = await Promise.all(
    activeWebhooks.map((webhook) => sendWebhook(webhook, payload, config))
  );

  return deliveries;
}

/**
 * Create a validation complete payload
 */
export function createValidationCompletePayload(
  email: string,
  result: {
    valid: boolean;
    score: number;
    deliverability: string;
    risk: string;
  }
): WebhookPayload {
  return {
    event: 'validation.complete',
    timestamp: new Date().toISOString(),
    data: {
      email,
      result,
      validatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Create a validation failed payload
 */
export function createValidationFailedPayload(
  email: string,
  error: string
): WebhookPayload {
  return {
    event: 'validation.failed',
    timestamp: new Date().toISOString(),
    data: {
      email,
      error,
      failedAt: new Date().toISOString(),
    },
  };
}

/**
 * Create a bulk complete payload
 */
export function createBulkCompletePayload(
  batchId: string,
  totalEmails: number,
  validCount: number,
  invalidCount: number
): WebhookPayload {
  return {
    event: 'bulk.complete',
    timestamp: new Date().toISOString(),
    data: {
      batchId,
      totalEmails,
      validCount,
      invalidCount,
      completedAt: new Date().toISOString(),
    },
  };
}

/**
 * Create a bulk progress payload
 */
export function createBulkProgressPayload(
  batchId: string,
  totalEmails: number,
  processedEmails: number
): WebhookPayload {
  return {
    event: 'bulk.progress',
    timestamp: new Date().toISOString(),
    data: {
      batchId,
      totalEmails,
      processedEmails,
      progress: Math.round((processedEmails / totalEmails) * 100),
    },
  };
}

/**
 * Generate unique delivery ID
 */
function generateDeliveryId(): string {
  return `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
