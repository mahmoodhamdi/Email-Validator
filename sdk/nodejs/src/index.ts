/**
 * Email Validator SDK for Node.js
 * Official SDK for the Email Validator API
 */

export interface ValidationResult {
  email: string;
  isValid: boolean;
  score: number;
  deliverability: 'deliverable' | 'risky' | 'undeliverable' | 'unknown';
  risk: 'low' | 'medium' | 'high';
  checks: ValidationChecks;
  timestamp: string;
}

export interface ValidationChecks {
  syntax: { valid: boolean; message: string };
  domain: { valid: boolean; exists: boolean; message: string };
  mx: { valid: boolean; records: string[]; message: string };
  disposable: { isDisposable: boolean; message: string };
  roleBased: { isRoleBased: boolean; role: string | null };
  freeProvider: { isFree: boolean; provider: string | null };
  typo: { hasTypo: boolean; suggestion: string | null };
  blacklisted: { isBlacklisted: boolean; lists: string[] };
  catchAll: { isCatchAll: boolean };
  smtp?: SMTPCheck;
  authentication?: AuthenticationCheck;
  reputation?: ReputationCheck;
  gravatar?: GravatarCheck;
}

export interface SMTPCheck {
  checked: boolean;
  exists?: boolean;
  catchAll?: boolean;
  message: string;
}

export interface AuthenticationCheck {
  checked: boolean;
  authentication?: {
    spf: { exists: boolean; strength: string; message: string };
    dmarc: { exists: boolean; strength: string; message: string };
    dkim: { found: boolean; recordCount: number; message: string };
    score: number;
    summary: string;
  };
  message: string;
}

export interface ReputationCheck {
  checked: boolean;
  reputation?: {
    score: number;
    risk: string;
    summary: string;
  };
  message: string;
}

export interface GravatarCheck {
  checked: boolean;
  gravatar?: {
    exists: boolean;
    hash: string;
    url: string;
    thumbnailUrl: string;
    profileUrl?: string;
  };
  message: string;
}

export interface BulkValidationResult {
  results: ValidationResult[];
  metadata: {
    total: number;
    completed: number;
    duplicatesRemoved: number;
    invalidRemoved: number;
    timedOut: boolean;
    processingTimeMs: number;
  };
}

export interface ValidateOptions {
  smtpCheck?: boolean;
  authCheck?: boolean;
  reputationCheck?: boolean;
  gravatarCheck?: boolean;
  webhookUrl?: string;
}

export interface EmailValidatorConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export class EmailValidator {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: EmailValidatorConfig = {}) {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Validate a single email address
   */
  async validate(email: string, options: ValidateOptions = {}): Promise<ValidationResult> {
    const response = await this.request('/api/validate', {
      method: 'POST',
      body: JSON.stringify({
        email,
        smtpCheck: options.smtpCheck,
        authCheck: options.authCheck,
        reputationCheck: options.reputationCheck,
        gravatarCheck: options.gravatarCheck,
      }),
    });

    return response as ValidationResult;
  }

  /**
   * Validate multiple email addresses
   */
  async validateBulk(emails: string[]): Promise<BulkValidationResult> {
    const response = await this.request('/api/validate-bulk', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });

    return response as BulkValidationResult;
  }

  /**
   * Check API health status
   */
  async health(): Promise<{ status: string; version: string; timestamp: string }> {
    const response = await this.request('/api/health', {
      method: 'GET',
    });

    return response as { status: string; version: string; timestamp: string };
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }
}

export default EmailValidator;
