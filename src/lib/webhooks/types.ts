/**
 * Webhook Types
 *
 * Type definitions for webhook notifications.
 */

export interface Webhook {
  /** Unique identifier */
  id: string;
  /** Webhook endpoint URL */
  url: string;
  /** Secret for HMAC signature */
  secret: string;
  /** Events this webhook subscribes to */
  events: WebhookEventType[];
  /** Whether the webhook is active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Last trigger timestamp */
  lastTriggeredAt?: Date;
  /** Consecutive failure count */
  failureCount: number;
  /** Optional description */
  description?: string;
}

export type WebhookEventType =
  | 'validation.complete'
  | 'validation.failed'
  | 'bulk.complete'
  | 'bulk.progress';

export interface WebhookPayload {
  /** Event type */
  event: WebhookEventType;
  /** ISO timestamp */
  timestamp: string;
  /** Event-specific data */
  data: WebhookEventData;
}

export type WebhookEventData =
  | ValidationCompleteData
  | ValidationFailedData
  | BulkCompleteData
  | BulkProgressData;

export interface ValidationCompleteData {
  /** Email that was validated */
  email: string;
  /** Validation result summary */
  result: {
    valid: boolean;
    score: number;
    deliverability: string;
    risk: string;
  };
  /** Validation timestamp */
  validatedAt: string;
}

export interface ValidationFailedData {
  /** Email that failed validation */
  email: string;
  /** Error message */
  error: string;
  /** Failure timestamp */
  failedAt: string;
}

export interface BulkCompleteData {
  /** Batch identifier */
  batchId: string;
  /** Total emails in batch */
  totalEmails: number;
  /** Count of valid emails */
  validCount: number;
  /** Count of invalid emails */
  invalidCount: number;
  /** Completion timestamp */
  completedAt: string;
}

export interface BulkProgressData {
  /** Batch identifier */
  batchId: string;
  /** Total emails in batch */
  totalEmails: number;
  /** Number of processed emails */
  processedEmails: number;
  /** Progress percentage (0-100) */
  progress: number;
}

export interface WebhookDelivery {
  /** Unique delivery ID */
  id: string;
  /** Associated webhook ID */
  webhookId: string;
  /** Event type */
  event: WebhookEventType;
  /** Full payload sent */
  payload: WebhookPayload;
  /** Delivery status */
  status: 'pending' | 'success' | 'failed';
  /** Number of attempts */
  attempts: number;
  /** Last attempt timestamp */
  lastAttemptAt?: Date;
  /** HTTP response status */
  responseStatus?: number;
  /** Response body (truncated) */
  responseBody?: string;
  /** Error message if failed */
  error?: string;
  /** Creation timestamp */
  createdAt: Date;
}

export interface WebhookConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Base delay between retries in ms */
  retryDelayMs: number;
  /** Request timeout in ms */
  timeoutMs: number;
}

export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 10000,
};

export const WEBHOOK_EVENTS: { value: WebhookEventType; label: string; description: string }[] = [
  {
    value: 'validation.complete',
    label: 'Validation Complete',
    description: 'Triggered when a single email validation completes successfully',
  },
  {
    value: 'validation.failed',
    label: 'Validation Failed',
    description: 'Triggered when a single email validation fails',
  },
  {
    value: 'bulk.complete',
    label: 'Bulk Complete',
    description: 'Triggered when a bulk validation batch completes',
  },
  {
    value: 'bulk.progress',
    label: 'Bulk Progress',
    description: 'Triggered periodically during bulk validation',
  },
];
