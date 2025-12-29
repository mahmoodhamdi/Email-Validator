/**
 * @jest-environment node
 */
import {
  withTimeout,
  fetchWithTimeout,
  TimeoutError,
  isTimeoutError,
  isAbortError,
} from '@/lib/utils/timeout';

describe('Timeout Utilities', () => {
  describe('TimeoutError', () => {
    it('should create a TimeoutError with correct properties', () => {
      const error = new TimeoutError('Test timeout', 5000);

      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Test timeout');
      expect(error.timeoutMs).toBe(5000);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('isTimeoutError', () => {
    it('should return true for TimeoutError instances', () => {
      const error = new TimeoutError('Test', 1000);
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error');
      expect(isTimeoutError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isTimeoutError('string')).toBe(false);
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(undefined)).toBe(false);
      expect(isTimeoutError({})).toBe(false);
    });
  });

  describe('isAbortError', () => {
    it('should return true for AbortError instances', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      expect(isAbortError(error)).toBe(true);
    });

    it('should return false for regular errors', () => {
      const error = new Error('Regular error');
      expect(isAbortError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isAbortError('string')).toBe(false);
      expect(isAbortError(null)).toBe(false);
    });
  });

  describe('withTimeout', () => {
    it('should resolve if promise completes before timeout', async () => {
      const promise = Promise.resolve('success');

      const result = await withTimeout(promise, { timeoutMs: 1000 });

      expect(result).toBe('success');
    });

    it('should throw TimeoutError if promise exceeds timeout', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 100, 'late'));

      await expect(
        withTimeout(promise, { timeoutMs: 10 })
      ).rejects.toThrow(TimeoutError);
    });

    it('should include timeout duration in error message', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 100, 'late'));

      await expect(
        withTimeout(promise, { timeoutMs: 10 })
      ).rejects.toThrow('Operation timed out after 10ms');
    });

    it('should use custom error message if provided', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 100, 'late'));

      await expect(
        withTimeout(promise, {
          timeoutMs: 10,
          errorMessage: 'Custom timeout message',
        })
      ).rejects.toThrow('Custom timeout message');
    });

    it('should return fallback value on timeout if provided', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 100, 'late'));

      const result = await withTimeout(promise, {
        timeoutMs: 10,
        fallback: 'fallback-value',
      });

      expect(result).toBe('fallback-value');
    });

    it('should propagate errors from the original promise', async () => {
      const promise = Promise.reject(new Error('Original error'));

      await expect(
        withTimeout(promise, { timeoutMs: 1000 })
      ).rejects.toThrow('Original error');
    });

    it('should handle null fallback value correctly', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 100, 'late'));

      const result = await withTimeout(promise, {
        timeoutMs: 10,
        fallback: null as unknown as string,
      });

      expect(result).toBeNull();
    });

    it('should handle async functions correctly', async () => {
      const asyncFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return 'async result';
      };

      const result = await withTimeout(asyncFn(), { timeoutMs: 1000 });

      expect(result).toBe('async result');
    });
  });

  describe('fetchWithTimeout', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should call fetch with the correct URL and options', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
      });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await fetchWithTimeout('https://example.com/api', { method: 'GET' }, 5000);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should return response if fetch completes before timeout', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
      });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const response = await fetchWithTimeout('https://example.com', {}, 5000);

      expect(response).toBe(mockResponse);
    });

    it('should throw TimeoutError if fetch exceeds timeout', async () => {
      global.fetch = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      await expect(
        fetchWithTimeout('https://example.com', {}, 10)
      ).rejects.toThrow(TimeoutError);
    });

    it('should include URL in timeout error message', async () => {
      global.fetch = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      await expect(
        fetchWithTimeout('https://example.com/api', {}, 10)
      ).rejects.toThrow('Request to https://example.com/api timed out after 10ms');
    });

    it('should propagate fetch errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        fetchWithTimeout('https://example.com', {}, 5000)
      ).rejects.toThrow('Network error');
    });
  });
});
