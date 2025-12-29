/**
 * @jest-environment node
 */
import {
  createBulkJob,
  getJob,
  getJobProgress,
  getJobResults,
  cancelJob,
  deleteJob,
  getAllJobs,
  cleanupOldJobs,
} from '@/lib/bulk-jobs';
import { clearAllCaches } from '@/lib/cache';

// Mock fetch for MX lookups
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('dns.google')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: 0,
            Answer: [{ type: 15, data: '10 mx.example.com.' }],
          }),
      });
    }
    return originalFetch(url);
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  clearAllCaches();
  jest.clearAllMocks();
});

describe('Bulk Jobs', () => {
  describe('createBulkJob', () => {
    it('should create a job with unique ID', () => {
      const jobId = createBulkJob(['test@example.com']);

      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^job_/);
    });

    it('should create jobs with different IDs', () => {
      const jobId1 = createBulkJob(['test1@example.com']);
      const jobId2 = createBulkJob(['test2@example.com']);

      expect(jobId1).not.toBe(jobId2);
    });

    it('should set initial job status to pending or processing', () => {
      const jobId = createBulkJob(['test@example.com']);
      const job = getJob(jobId);

      expect(job).not.toBeNull();
      expect(['pending', 'processing']).toContain(job!.status);
    });

    it('should track total email count', () => {
      const emails = ['a@test.com', 'b@test.com', 'c@test.com'];
      const jobId = createBulkJob(emails);
      const job = getJob(jobId);

      expect(job!.total).toBe(3);
    });
  });

  describe('getJob', () => {
    it('should return null for non-existent job', () => {
      const job = getJob('non-existent-job');

      expect(job).toBeNull();
    });

    it('should return job details', () => {
      const jobId = createBulkJob(['test@example.com']);
      const job = getJob(jobId);

      expect(job).not.toBeNull();
      expect(job!.id).toBe(jobId);
      expect(job!.createdAt).toBeDefined();
    });
  });

  describe('getJobProgress', () => {
    it('should return null for non-existent job', () => {
      const progress = getJobProgress('non-existent-job');

      expect(progress).toBeNull();
    });

    it('should return progress information', () => {
      const jobId = createBulkJob(['test@example.com']);
      const progress = getJobProgress(jobId);

      expect(progress).not.toBeNull();
      expect(progress!.id).toBe(jobId);
      expect(progress!.total).toBe(1);
      expect(progress!.percentComplete).toBeDefined();
    });
  });

  describe('cancelJob', () => {
    it('should return false for non-existent job', () => {
      const result = cancelJob('non-existent-job');

      expect(result).toBe(false);
    });

    it('should return false for completed job', async () => {
      const jobId = createBulkJob(['test@example.com']);

      // Wait for job to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      const result = cancelJob(jobId);

      // Should return false because job is already completed
      expect(result).toBe(false);
    });
  });

  describe('deleteJob', () => {
    it('should delete an existing job', async () => {
      const jobId = createBulkJob(['test@example.com']);

      // Wait for job to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      const deleted = deleteJob(jobId);

      expect(deleted).toBe(true);
      expect(getJob(jobId)).toBeNull();
    });

    it('should return false for non-existent job', () => {
      const result = deleteJob('non-existent-job');

      expect(result).toBe(false);
    });
  });

  describe('getAllJobs', () => {
    it('should return all jobs', () => {
      createBulkJob(['a@test.com']);
      createBulkJob(['b@test.com']);

      const jobs = getAllJobs();

      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('job processing', () => {
    it('should process emails and update progress', async () => {
      const emails = ['test1@example.com', 'test2@example.com'];
      const jobId = createBulkJob(emails);

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const job = getJob(jobId);

      expect(job!.status).toBe('completed');
      expect(job!.progress).toBe(2);
      expect(job!.results.length).toBe(2);
    });

    it('should set processing time', async () => {
      const jobId = createBulkJob(['test@example.com']);

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      const job = getJob(jobId);

      // processingTimeMs may be 0 for very fast operations
      expect(job!.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(job!.completedAt).toBeDefined();
    });

    it('should handle validation errors gracefully', async () => {
      // Create job with potentially problematic email
      const jobId = createBulkJob(['test@example.com']);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      const job = getJob(jobId);

      expect(job!.status).toBe('completed');
      expect(job!.results.length).toBeGreaterThan(0);
    });
  });

  describe('getJobResults', () => {
    it('should return null for non-existent job', () => {
      const results = getJobResults('non-existent-job');

      expect(results).toBeNull();
    });

    it('should return null for incomplete job', () => {
      const jobId = createBulkJob(['test@example.com']);
      // Don't wait - check immediately
      const results = getJobResults(jobId);

      // May be null if still processing, or have results if fast
      // This is expected behavior
      expect(results === null || Array.isArray(results)).toBe(true);
    });

    it('should return results for completed job', async () => {
      const jobId = createBulkJob(['test@example.com']);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 300));

      const results = getJobResults(jobId);

      expect(results).not.toBeNull();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('cleanupOldJobs', () => {
    it('should not throw when called', () => {
      expect(() => cleanupOldJobs()).not.toThrow();
    });

    it('should return count of cleaned jobs', () => {
      const cleaned = cleanupOldJobs();

      expect(typeof cleaned).toBe('number');
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });
});
