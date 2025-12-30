/**
 * Email Validator SDK Types
 */

export interface EmailValidatorConfig {
  /** Base URL of the Email Validator API */
  baseUrl: string;
  /** API key for authentication (optional) */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
}

export interface ValidationOptions {
  /** Enable SMTP verification (default: false) */
  smtpCheck?: boolean;
  /** Enable authentication checks (default: false) */
  authCheck?: boolean;
  /** Enable reputation check (default: false) */
  reputationCheck?: boolean;
  /** Enable Gravatar check (default: false) */
  gravatarCheck?: boolean;
}

export interface ValidationResult {
  email: string;
  valid: boolean;
  score: number;
  deliverability: 'deliverable' | 'risky' | 'undeliverable' | 'unknown';
  risk: 'low' | 'medium' | 'high';
  checks: ValidationChecks;
  suggestions?: string[];
  validatedAt: string;
}

export interface ValidationChecks {
  syntax: SyntaxCheck;
  domain: DomainCheck;
  mx: MXCheck;
  disposable: DisposableCheck;
  roleBased: RoleBasedCheck;
  freeProvider: FreeProviderCheck;
  typo?: TypoCheck;
  smtp?: SMTPCheck;
  authentication?: AuthenticationCheck;
  reputation?: ReputationCheck;
  gravatar?: GravatarCheck;
}

export interface SyntaxCheck {
  valid: boolean;
  localPart?: string;
  domain?: string;
}

export interface DomainCheck {
  valid: boolean;
  exists: boolean;
}

export interface MXCheck {
  valid: boolean;
  records: string[];
  priority?: number[];
}

export interface DisposableCheck {
  isDisposable: boolean;
}

export interface RoleBasedCheck {
  isRoleBased: boolean;
  role?: string;
}

export interface FreeProviderCheck {
  isFreeProvider: boolean;
  provider?: string;
}

export interface TypoCheck {
  hasTypo: boolean;
  suggestion?: string;
}

export interface SMTPCheck {
  checked: boolean;
  exists: boolean | null;
  catchAll: boolean;
  message: string;
}

export interface AuthenticationCheck {
  checked: boolean;
  score: number;
  spf: { exists: boolean; strength: string };
  dmarc: { exists: boolean; strength: string };
  dkim: { found: boolean; recordCount: number };
}

export interface ReputationCheck {
  checked: boolean;
  score: number;
  risk: string;
}

export interface GravatarCheck {
  checked: boolean;
  exists: boolean;
  url?: string;
}

export interface BulkValidationResult {
  results: ValidationResult[];
  summary: BulkSummary;
  processingTime: number;
}

export interface BulkSummary {
  total: number;
  valid: number;
  invalid: number;
  risky: number;
  unknown: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
}
