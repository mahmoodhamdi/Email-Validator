/**
 * CLI-specific types
 */

export interface ValidateOptions {
  format: 'json' | 'table' | 'simple';
  verbose: boolean;
}

export interface BulkOptions {
  output?: string;
  format: 'json' | 'csv' | 'table';
  filter: 'all' | 'valid' | 'invalid' | 'risky';
  progress: boolean;
  concurrency: string;
}

export interface ValidationResultCLI {
  email: string;
  isValid: boolean;
  score: number;
  deliverability: string;
  risk: string;
  checks?: {
    syntax: { valid: boolean; message: string };
    domain: { valid: boolean; message: string };
    mx: { valid: boolean; message: string };
    disposable: { isDisposable: boolean; message: string };
    roleBased: { isRoleBased: boolean; role: string | null };
    freeProvider: { isFree: boolean; provider: string | null };
    typo: { hasTypo: boolean; suggestion: string | null };
  };
  error?: string;
}
