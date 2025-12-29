/**
 * Bulk validation job management.
 * Handles background processing for large email batches.
 */

import type { ValidationResult } from '@/types/email';
import { validateEmail } from './validators';
import { BULK_CONFIG, VALIDATION_TIMEOUTS } from './constants';

/**
 * Status of a bulk validation job.
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Bulk validation job structure.
 */
export interface BulkJob {
  id: string;
  status: JobStatus;
  progress: number;
  total: number;
  results: ValidationResult[];
  errors: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  processingTimeMs?: number;
}

/**
 * Job progress information for polling.
 */
export interface JobProgress {
  id: string;
  status: JobStatus;
  progress: number;
  total: number;
  percentComplete: number;
  estimatedRemainingMs?: number;
}

// In-memory job storage (for production, use Redis or database)
const jobs = new Map<string, BulkJob>();

// Job cleanup interval (30 minutes)
const JOB_CLEANUP_INTERVAL = 30 * 60 * 1000;
// Job TTL (1 hour)
const JOB_TTL = 60 * 60 * 1000;

/**
 * Generate a unique job ID.
 */
function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `job_${timestamp}_${random}`;
}

/**
 * Create a new bulk validation job.
 * The job starts processing immediately in the background.
 *
 * @param emails - Array of emails to validate
 * @returns Job ID for tracking progress
 */
export function createBulkJob(emails: string[]): string {
  const jobId = generateJobId();
  const now = new Date().toISOString();

  const job: BulkJob = {
    id: jobId,
    status: 'pending',
    progress: 0,
    total: emails.length,
    results: [],
    errors: [],
    createdAt: now,
  };

  jobs.set(jobId, job);

  // Start processing in background
  processBulkJob(jobId, emails);

  return jobId;
}

/**
 * Process a bulk validation job in the background.
 */
async function processBulkJob(jobId: string, emails: string[]): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }

  const startTime = Date.now();
  job.status = 'processing';
  job.startedAt = new Date().toISOString();

  const { batchSize, batchDelayMs } = BULK_CONFIG;
  const maxTimeout = VALIDATION_TIMEOUTS.bulkValidation;

  try {
    for (let i = 0; i < emails.length; i += batchSize) {
      // Check if job was cancelled (status can be changed externally)
      const currentStatus = job.status as JobStatus;
      if (currentStatus === 'cancelled') {
        break;
      }

      // Check for timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > maxTimeout) {
        job.errors.push(`Job timed out after ${elapsed}ms`);
        break;
      }

      const batch = emails.slice(i, i + batchSize);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (email) => {
          try {
            return await validateEmail(email);
          } catch (error) {
            return createErrorResult(email, error);
          }
        })
      );

      // Collect results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          job.results.push(result.value);
        } else {
          job.errors.push(result.reason?.message || 'Unknown error');
        }
      }

      // Update progress
      job.progress = job.results.length;

      // Add delay between batches (except for last batch)
      if (i + batchSize < emails.length && batchDelayMs > 0) {
        await delay(batchDelayMs);
      }
    }

    job.status = (job.status as JobStatus) === 'cancelled' ? 'cancelled' : 'completed';
  } catch (error) {
    job.status = 'failed';
    job.errors.push(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    job.completedAt = new Date().toISOString();
    job.processingTimeMs = Date.now() - startTime;
  }
}

/**
 * Create an error result for a failed email validation.
 */
function createErrorResult(email: string, error: unknown): ValidationResult {
  const message = error instanceof Error ? error.message : 'Validation failed';

  return {
    email: email.trim(),
    isValid: false,
    score: 0,
    checks: {
      syntax: { valid: false, message },
      domain: { valid: false, exists: false, message: 'Skipped' },
      mx: { valid: false, records: [], message: 'Skipped' },
      disposable: { isDisposable: false, message: 'Skipped' },
      roleBased: { isRoleBased: false, role: null },
      freeProvider: { isFree: false, provider: null },
      typo: { hasTypo: false, suggestion: null },
      blacklisted: { isBlacklisted: false, lists: [] },
      catchAll: { isCatchAll: false },
    },
    deliverability: 'unknown',
    risk: 'high',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get a job by ID.
 */
export function getJob(jobId: string): BulkJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Get job progress for polling.
 */
export function getJobProgress(jobId: string): JobProgress | null {
  const job = jobs.get(jobId);
  if (!job) {
    return null;
  }

  const percentComplete = job.total > 0
    ? Math.round((job.progress / job.total) * 100)
    : 0;

  // Estimate remaining time based on current progress
  let estimatedRemainingMs: number | undefined;
  if (job.status === 'processing' && job.startedAt && job.progress > 0) {
    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    const msPerEmail = elapsed / job.progress;
    const remaining = job.total - job.progress;
    estimatedRemainingMs = Math.round(msPerEmail * remaining);
  }

  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    total: job.total,
    percentComplete,
    estimatedRemainingMs,
  };
}

/**
 * Get job results (only if completed).
 */
export function getJobResults(jobId: string): ValidationResult[] | null {
  const job = jobs.get(jobId);
  if (!job || job.status !== 'completed') {
    return null;
  }
  return job.results;
}

/**
 * Cancel a running job.
 */
export function cancelJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job || job.status !== 'processing') {
    return false;
  }

  job.status = 'cancelled';
  return true;
}

/**
 * Delete a job from memory.
 */
export function deleteJob(jobId: string): boolean {
  return jobs.delete(jobId);
}

/**
 * Get all jobs (for admin/debugging).
 */
export function getAllJobs(): BulkJob[] {
  return Array.from(jobs.values());
}

/**
 * Clean up old jobs.
 */
export function cleanupOldJobs(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, job] of jobs) {
    const createdTime = new Date(job.createdAt).getTime();
    if (now - createdTime > JOB_TTL) {
      jobs.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Helper function to create a delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start periodic cleanup (only on server)
if (typeof window === 'undefined') {
  setInterval(cleanupOldJobs, JOB_CLEANUP_INTERVAL);
}
