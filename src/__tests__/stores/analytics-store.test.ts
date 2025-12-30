/**
 * Tests for Analytics Store
 */

import { act } from '@testing-library/react';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import { useAnalyticsStore } from '@/stores/analytics-store';

describe('Analytics Store', () => {
  beforeEach(() => {
    useAnalyticsStore.getState().clearRequests();
    jest.clearAllMocks();
  });

  describe('recordRequest', () => {
    it('adds request to store', () => {
      act(() => {
        useAnalyticsStore.getState().recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
      });

      const state = useAnalyticsStore.getState();
      expect(state.requests).toHaveLength(1);
      expect(state.requests[0].endpoint).toBe('/api/validate');
    });

    it('generates unique IDs', () => {
      act(() => {
        useAnalyticsStore.getState().recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        useAnalyticsStore.getState().recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
      });

      const state = useAnalyticsStore.getState();
      expect(state.requests[0].id).not.toBe(state.requests[1].id);
    });

    it('limits stored requests to maxStoredRequests', () => {
      act(() => {
        for (let i = 0; i < 100; i++) {
          useAnalyticsStore.getState().recordRequest({
            endpoint: '/api/validate',
            method: 'POST',
            statusCode: 200,
            responseTimeMs: 100,
            timestamp: new Date(),
          });
        }
      });

      const state = useAnalyticsStore.getState();
      expect(state.requests.length).toBeLessThanOrEqual(state.maxStoredRequests);
    });

    it('keeps newest requests when limit exceeded', () => {
      act(() => {
        useAnalyticsStore.getState().recordRequest({
          endpoint: '/api/old',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        useAnalyticsStore.getState().recordRequest({
          endpoint: '/api/new',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
      });

      const state = useAnalyticsStore.getState();
      expect(state.requests[0].endpoint).toBe('/api/new');
      expect(state.requests[1].endpoint).toBe('/api/old');
    });
  });

  describe('clearRequests', () => {
    it('clears all requests', () => {
      act(() => {
        useAnalyticsStore.getState().recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
      });

      expect(useAnalyticsStore.getState().requests).toHaveLength(1);

      act(() => {
        useAnalyticsStore.getState().clearRequests();
      });

      expect(useAnalyticsStore.getState().requests).toHaveLength(0);
    });
  });

  describe('getUsageStats', () => {
    it('calculates correct statistics', () => {
      const store = useAnalyticsStore.getState();

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 500,
          responseTimeMs: 200,
          timestamp: new Date(),
        });
      });

      const stats = store.getUsageStats();

      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(1);
      expect(stats.averageResponseTime).toBe(150);
    });

    it('groups requests by endpoint', () => {
      const store = useAnalyticsStore.getState();

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/validate-bulk',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
      });

      const stats = store.getUsageStats();

      expect(stats.requestsByEndpoint['/api/validate']).toBe(2);
      expect(stats.requestsByEndpoint['/api/validate-bulk']).toBe(1);
    });

    it('groups requests by status code', () => {
      const store = useAnalyticsStore.getState();

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 400,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 500,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
      });

      const stats = store.getUsageStats();

      expect(stats.requestsByStatus[200]).toBe(1);
      expect(stats.requestsByStatus[400]).toBe(1);
      expect(stats.requestsByStatus[500]).toBe(1);
    });

    it('filters by date', () => {
      const store = useAnalyticsStore.getState();
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: now,
        });
      });

      const stats = store.getUsageStats(yesterday);
      expect(stats.totalRequests).toBe(1);

      const futureStats = store.getUsageStats(new Date(now.getTime() + 1000));
      expect(futureStats.totalRequests).toBe(0);
    });

    it('returns zero for empty store', () => {
      const store = useAnalyticsStore.getState();
      const stats = store.getUsageStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
    });
  });

  describe('getHourlyStats', () => {
    it('returns stats for last 24 hours', () => {
      const store = useAnalyticsStore.getState();
      const stats = store.getHourlyStats(24);

      expect(stats).toHaveLength(24);
    });

    it('aggregates requests by hour', () => {
      const store = useAnalyticsStore.getState();
      const now = new Date();

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: now,
        });
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 500,
          responseTimeMs: 200,
          timestamp: now,
        });
      });

      const stats = store.getHourlyStats(1);

      expect(stats[0].requests).toBe(2);
      expect(stats[0].errors).toBe(1);
      expect(stats[0].avgResponseTime).toBe(150);
    });
  });

  describe('getDailyStats', () => {
    it('returns stats for last 30 days', () => {
      const store = useAnalyticsStore.getState();
      const stats = store.getDailyStats(30);

      expect(stats).toHaveLength(30);
    });

    it('aggregates requests by day', () => {
      const store = useAnalyticsStore.getState();
      const now = new Date();

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: now,
        });
      });

      const stats = store.getDailyStats(1);

      expect(stats[0].requests).toBe(1);
    });
  });

  describe('getEndpointStats', () => {
    it('groups by endpoint', () => {
      const store = useAnalyticsStore.getState();

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/validate-bulk',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 200,
          timestamp: new Date(),
        });
      });

      const stats = store.getEndpointStats();

      expect(stats).toHaveLength(2);
      expect(stats.find((s) => s.endpoint === '/api/validate')).toBeTruthy();
    });

    it('calculates success rate correctly', () => {
      const store = useAnalyticsStore.getState();

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 500,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 500,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
      });

      const stats = store.getEndpointStats();
      const validateStats = stats.find((s) => s.endpoint === '/api/validate');

      expect(validateStats?.successRate).toBe(50);
    });

    it('calculates P95 response time', () => {
      const store = useAnalyticsStore.getState();

      act(() => {
        // Add 100 requests with varying response times
        for (let i = 1; i <= 100; i++) {
          store.recordRequest({
            endpoint: '/api/validate',
            method: 'POST',
            statusCode: 200,
            responseTimeMs: i * 10, // 10, 20, 30, ... 1000
            timestamp: new Date(),
          });
        }
      });

      const stats = store.getEndpointStats();
      const validateStats = stats.find((s) => s.endpoint === '/api/validate');

      // P95 should be around 950ms (95th percentile of 10-1000)
      expect(validateStats?.p95ResponseTime).toBeGreaterThanOrEqual(950);
    });

    it('sorts by request count', () => {
      const store = useAnalyticsStore.getState();

      act(() => {
        store.recordRequest({
          endpoint: '/api/less',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/more',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
        store.recordRequest({
          endpoint: '/api/more',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
      });

      const stats = store.getEndpointStats();

      expect(stats[0].endpoint).toBe('/api/more');
      expect(stats[1].endpoint).toBe('/api/less');
    });
  });

  describe('exportData', () => {
    it('exports as JSON', () => {
      const store = useAnalyticsStore.getState();

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
      });

      const json = store.exportData('json');
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].endpoint).toBe('/api/validate');
    });

    it('exports as CSV with headers', () => {
      const store = useAnalyticsStore.getState();

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 100,
          timestamp: new Date(),
        });
      });

      const csv = store.exportData('csv');
      const lines = csv.split('\n');

      expect(lines[0]).toContain('endpoint');
      expect(lines[0]).toContain('method');
      expect(lines[0]).toContain('statusCode');
      expect(lines[1]).toContain('/api/validate');
    });

    it('exports empty data correctly', () => {
      const store = useAnalyticsStore.getState();

      const json = store.exportData('json');
      expect(json).toBe('[]');

      const csv = store.exportData('csv');
      expect(csv.split('\n')).toHaveLength(1); // Just headers
    });

    it('handles error field in CSV', () => {
      const store = useAnalyticsStore.getState();

      act(() => {
        store.recordRequest({
          endpoint: '/api/validate',
          method: 'POST',
          statusCode: 500,
          responseTimeMs: 100,
          timestamp: new Date(),
          error: 'Internal server error',
        });
      });

      const csv = store.exportData('csv');
      expect(csv).toContain('Internal server error');
    });
  });
});
