export type DeliverabilityStatus = 'deliverable' | 'risky' | 'undeliverable' | 'unknown';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface SyntaxCheck {
  valid: boolean;
  message: string;
}

export interface DomainCheck {
  valid: boolean;
  exists: boolean;
  message: string;
}

export interface MxCheck {
  valid: boolean;
  records: string[];
  message: string;
}

export interface DisposableCheck {
  isDisposable: boolean;
  message: string;
}

export interface RoleBasedCheck {
  isRoleBased: boolean;
  role: string | null;
}

export interface FreeProviderCheck {
  isFree: boolean;
  provider: string | null;
}

export interface TypoCheck {
  hasTypo: boolean;
  suggestion: string | null;
}

export interface BlacklistCheck {
  isBlacklisted: boolean;
  lists: string[];
}

export interface CatchAllCheck {
  isCatchAll: boolean;
}

export interface SMTPCheck {
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

export interface ValidationChecks {
  syntax: SyntaxCheck;
  domain: DomainCheck;
  mx: MxCheck;
  disposable: DisposableCheck;
  roleBased: RoleBasedCheck;
  freeProvider: FreeProviderCheck;
  typo: TypoCheck;
  blacklisted: BlacklistCheck;
  catchAll: CatchAllCheck;
  /** Optional SMTP verification result */
  smtp?: SMTPCheck;
}

export interface ValidationResult {
  email: string;
  isValid: boolean;
  score: number;
  checks: ValidationChecks;
  deliverability: DeliverabilityStatus;
  risk: RiskLevel;
  timestamp: string;
}

export interface BulkValidationProgress {
  total: number;
  completed: number;
  results: ValidationResult[];
}

export interface HistoryItem extends ValidationResult {
  id: string;
}
