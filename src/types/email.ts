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

export interface AuthenticationCheck {
  /** Whether the check was performed */
  checked: boolean;
  /** Authentication details (if checked) */
  authentication?: {
    spf: {
      exists: boolean;
      strength: 'strong' | 'moderate' | 'weak' | 'none';
      message: string;
    };
    dmarc: {
      exists: boolean;
      strength: 'strong' | 'moderate' | 'weak' | 'none';
      message: string;
    };
    dkim: {
      found: boolean;
      recordCount: number;
      message: string;
    };
    score: number;
    summary: string;
  };
  /** Human-readable message */
  message: string;
}

export interface ReputationCheck {
  /** Whether the check was performed */
  checked: boolean;
  /** Reputation details (if checked) */
  reputation?: {
    score: number;
    risk: 'low' | 'medium' | 'high' | 'critical';
    age: {
      ageInDays: number | null;
      isNew: boolean;
      isYoung: boolean;
      message: string;
    };
    blocklists: {
      listed: boolean;
      listedCount: number;
      message: string;
    };
    factors: Array<{
      name: string;
      impact: 'positive' | 'negative' | 'neutral';
      description: string;
    }>;
    summary: string;
  };
  /** Human-readable message */
  message: string;
}

export interface GravatarCheck {
  /** Whether the check was performed */
  checked: boolean;
  /** Gravatar details (if checked) */
  gravatar?: {
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
  };
  /** Human-readable message */
  message: string;
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
  /** Optional email authentication (SPF/DMARC/DKIM) result */
  authentication?: AuthenticationCheck;
  /** Optional domain reputation result */
  reputation?: ReputationCheck;
  /** Optional Gravatar profile result */
  gravatar?: GravatarCheck;
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
