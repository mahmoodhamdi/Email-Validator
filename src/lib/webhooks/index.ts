/**
 * Webhook Module
 *
 * Provides webhook notification functionality for email validation events.
 */

export {
  sendWebhook,
  broadcastWebhook,
  createValidationCompletePayload,
  createValidationFailedPayload,
  createBulkCompletePayload,
  createBulkProgressPayload,
} from './sender';

export {
  generateSignature,
  verifySignature,
  getSignatureHeaders,
  parseSignature,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
} from './signature';

export * from './types';
