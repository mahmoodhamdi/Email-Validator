/**
 * Email Validator SDK Client
 */

import {
  EmailValidatorConfig,
  ValidationOptions,
  ValidationResult,
  BulkValidationResult,
  HealthCheckResult,
} from './types';
import {
  EmailValidatorError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  TimeoutError,
} from './errors';
import {
  sleep,
  getBackoffDelay,
  isRetryableError,
  isValidEmailFormat,
} from './utils';

const DEFAULT_CONFIG: Required<Omit<EmailValidatorConfig, 'apiKey'>> = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};

export class EmailValidator {
  private readonly config: Required<Omit<EmailValidatorConfig, 'apiKey'>> & {
    apiKey?: string;
  };

  constructor(config: EmailValidatorConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Validate a single email address
   */
  async validate(
    email: string,
    options?: ValidationOptions
  ): Promise<ValidationResult> {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }

    if (!isValidEmailFormat(email)) {
      throw new ValidationError('Invalid email format');
    }

    const response = await this.request<ValidationResult>('/api/validate', {
      method: 'POST',
      body: JSON.stringify({ email, ...options }),
    });

    return response;
  }

  /**
   * Validate multiple email addresses
   */
  async validateBulk(
    emails: string[],
    options?: ValidationOptions
  ): Promise<BulkValidationResult> {
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      throw new ValidationError('Emails array is required');
    }

    if (emails.length > 1000) {
      throw new ValidationError('Maximum 1000 emails per request');
    }

    const response = await this.request<BulkValidationResult>(
      '/api/validate-bulk',
      {
        method: 'POST',
        body: JSON.stringify({ emails, ...options }),
      }
    );

    return response;
  }

  /**
   * Check API health status
   */
  async healthCheck(): Promise<HealthCheckResult> {
    return this.request<HealthCheckResult>('/api/health', {
      method: 'GET',
    });
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'EmailValidator-NodeJS-SDK/1.0.0',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(url, {
          ...options,
          headers: { ...headers, ...(options.headers as Record<string, string>) },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return await response.json();
        }

        // Handle specific error codes
        if (response.status === 401) {
          throw new AuthenticationError();
        }

        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfter = retryAfterHeader
            ? parseInt(retryAfterHeader, 10)
            : 60;
          throw new RateLimitError(retryAfter);
        }

        // Parse error response
        let errorDetails: unknown;
        try {
          errorDetails = await response.json();
        } catch {
          errorDetails = await response.text();
        }

        if (!isRetryableError(response.status)) {
          throw new EmailValidatorError(
            `API error: ${response.status}`,
            'API_ERROR',
            response.status,
            errorDetails
          );
        }

        lastError = new EmailValidatorError(
          `API error: ${response.status}`,
          'API_ERROR',
          response.status,
          errorDetails
        );
      } catch (error) {
        if (error instanceof EmailValidatorError) {
          if (!isRetryableError(error.statusCode)) {
            throw error;
          }
          lastError = error;
        } else if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = new TimeoutError(this.config.timeout);
          } else {
            lastError = new NetworkError(error.message, error);
          }
        }
      }

      // Wait before retry (except on last attempt)
      if (attempt < this.config.maxRetries) {
        const delay = getBackoffDelay(attempt, this.config.retryDelay);
        await sleep(delay);
      }
    }

    throw lastError || new NetworkError('Request failed after retries');
  }
}
