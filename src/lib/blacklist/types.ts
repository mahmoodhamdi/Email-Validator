/**
 * Custom Blacklist Types
 */

export interface BlacklistEntry {
  /** Unique identifier */
  id: string;
  /** Pattern to match (domain, email, or wildcard) */
  pattern: string;
  /** Type of pattern matching */
  type: 'domain' | 'email' | 'pattern';
  /** Optional reason for blacklisting */
  reason?: string;
  /** When the entry was created */
  createdAt: Date;
  /** Whether the entry is active */
  isActive: boolean;
}

export interface Blacklist {
  /** Unique identifier */
  id: string;
  /** Name of the blacklist */
  name: string;
  /** Optional description */
  description?: string;
  /** List of blacklist entries */
  entries: BlacklistEntry[];
  /** When the blacklist was created */
  createdAt: Date;
  /** When the blacklist was last updated */
  updatedAt: Date;
}

export interface BlacklistCheckResult {
  /** Whether the email is blacklisted */
  isBlacklisted: boolean;
  /** Entries that matched */
  matchedEntries: BlacklistEntry[];
  /** Human-readable message */
  message: string;
}

export interface BlacklistExport {
  /** Export format version */
  version: string;
  /** When the export was created */
  exportedAt: string;
  /** Blacklists to export */
  blacklists: Blacklist[];
}
