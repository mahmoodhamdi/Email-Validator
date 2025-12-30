/**
 * Webhook Signature
 *
 * HMAC signature generation and verification for webhook security.
 * Uses SHA-256 for secure signing.
 */

import crypto from 'crypto';

export const SIGNATURE_HEADER = 'X-Webhook-Signature';
export const TIMESTAMP_HEADER = 'X-Webhook-Timestamp';

/**
 * Generate HMAC signature for webhook payload
 *
 * @param payload - JSON string payload
 * @param secret - Webhook secret
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Signature in format "v1=<hex>"
 */
export function generateSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  // Combine timestamp and payload to prevent replay attacks
  const signaturePayload = `${timestamp}.${payload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  return `v1=${signature}`;
}

/**
 * Verify webhook signature
 *
 * @param payload - JSON string payload
 * @param signature - Signature from header
 * @param secret - Webhook secret
 * @param timestamp - Timestamp from header
 * @param toleranceMs - Maximum age of signature (default: 5 minutes)
 * @returns Whether signature is valid
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceMs: number = 300000 // 5 minutes
): boolean {
  // Check timestamp tolerance to prevent replay attacks
  const now = Date.now();
  if (Math.abs(now - timestamp) > toleranceMs) {
    return false;
  }

  // Generate expected signature
  const expectedSignature = generateSignature(payload, secret, timestamp);

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // Buffers of different lengths will throw
    return false;
  }
}

/**
 * Get signature headers for webhook request
 *
 * @param payload - JSON string payload
 * @param secret - Webhook secret
 * @returns Headers object with signature and timestamp
 */
export function getSignatureHeaders(
  payload: string,
  secret: string
): Record<string, string> {
  const timestamp = Date.now();
  const signature = generateSignature(payload, secret, timestamp);

  return {
    [SIGNATURE_HEADER]: signature,
    [TIMESTAMP_HEADER]: timestamp.toString(),
  };
}

/**
 * Parse signature from header value
 *
 * @param signatureHeader - Header value (e.g., "v1=abc123")
 * @returns Parsed signature or null if invalid format
 */
export function parseSignature(signatureHeader: string): {
  version: string;
  signature: string;
} | null {
  const match = signatureHeader.match(/^(v\d+)=([a-f0-9]+)$/i);
  if (!match) {
    return null;
  }

  return {
    version: match[1],
    signature: match[2],
  };
}
