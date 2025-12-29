/**
 * SMTP Verification Types
 *
 * Types for SMTP-level email verification to check if a mailbox actually exists.
 */

import type { Socket } from 'net';

/**
 * Configuration options for SMTP verification
 */
export interface SMTPConfig {
  /** Connection timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts */
  retries: number;
  /** MAIL FROM address used for verification */
  fromEmail: string;
  /** HELO/EHLO hostname */
  helo: string;
  /** Ports to try in order (25 = SMTP, 587 = submission) */
  ports: number[];
}

/**
 * Result of SMTP verification
 */
export interface SMTPResult {
  /** Whether mailbox exists (null = unknown) */
  exists: boolean | null;
  /** Whether server is a catch-all (accepts all addresses) */
  catchAll: boolean;
  /** Whether server responded with greylisting */
  greylisted: boolean;
  /** Human-readable message */
  message: string;
  /** SMTP response code */
  responseCode?: number;
  /** Time taken for verification in ms */
  responseTime: number;
}

/**
 * SMTP connection state
 */
export interface SMTPConnection {
  socket: Socket;
  connected: boolean;
  lastResponse: string;
  responseCode: number;
}

/**
 * Standard SMTP response codes
 */
export type SMTPResponseCode =
  | 220  // Service ready
  | 221  // Service closing
  | 250  // OK
  | 251  // User not local; will forward
  | 252  // Cannot verify user, but will accept
  | 354  // Start mail input
  | 421  // Service not available
  | 450  // Mailbox unavailable (busy/greylisting)
  | 451  // Local error
  | 452  // Insufficient storage
  | 500  // Syntax error
  | 501  // Syntax error in parameters
  | 502  // Command not implemented
  | 503  // Bad sequence of commands
  | 504  // Command parameter not implemented
  | 550  // Mailbox unavailable (not found)
  | 551  // User not local
  | 552  // Storage exceeded
  | 553  // Mailbox name not allowed
  | 554; // Transaction failed

/**
 * Rate limit entry for a domain
 */
export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * SMTP check result for validator integration
 */
export interface SMTPCheckResult {
  /** Whether SMTP check was performed */
  checked: boolean;
  /** Whether mailbox exists (null = unknown) */
  exists: boolean | null;
  /** Whether server is a catch-all */
  catchAll: boolean;
  /** Whether greylisting was detected */
  greylisted: boolean;
  /** Human-readable message */
  message: string;
  /** Time taken for verification in ms */
  responseTime?: number;
}
