/**
 * Gravatar Types
 */

export interface GravatarResult {
  /** Whether Gravatar exists for this email */
  exists: boolean;
  /** MD5 hash of the email */
  hash: string;
  /** Full-size Gravatar URL */
  url: string;
  /** Thumbnail Gravatar URL */
  thumbnailUrl: string;
  /** Profile page URL (if exists) */
  profileUrl?: string;
  /** Display name from profile (if available) */
  displayName?: string;
}

export interface GravatarCheckResult {
  /** Whether the check was performed */
  checked: boolean;
  /** Gravatar details (if checked) */
  gravatar?: GravatarResult;
  /** Human-readable message */
  message: string;
}
