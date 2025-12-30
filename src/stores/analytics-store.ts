/**
 * Analytics Store
 *
 * Zustand store for tracking API usage and metrics
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  APIRequest,
  UsageStats,
  HourlyStats,
  DailyStats,
  EndpointStats,
} from '@/lib/analytics/types';

interface AnalyticsState {
  requests: APIRequest[];
  maxStoredRequests: number;

  // Recording
  recordRequest: (request: Omit<APIRequest, 'id'>) => void;
  clearRequests: () => void;

  // Statistics
  getUsageStats: (since?: Date) => UsageStats;
  getHourlyStats: (hours?: number) => HourlyStats[];
  getDailyStats: (days?: number) => DailyStats[];
  getEndpointStats: () => EndpointStats[];

  // Export
  exportData: (format: 'json' | 'csv') => string;
}

const generateId = () =>
  `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      requests: [],
      maxStoredRequests: 10000,

      recordRequest: (request) => {
        const newRequest: APIRequest = {
          ...request,
          id: generateId(),
        };

        set((state) => ({
          requests: [newRequest, ...state.requests].slice(
            0,
            state.maxStoredRequests
          ),
        }));
      },

      clearRequests: () => {
        set({ requests: [] });
      },

      getUsageStats: (since) => {
        const requests = get().requests.filter(
          (r) => !since || new Date(r.timestamp) >= since
        );

        const totalRequests = requests.length;
        const successfulRequests = requests.filter(
          (r) => r.statusCode < 400
        ).length;
        const failedRequests = totalRequests - successfulRequests;

        const totalResponseTime = requests.reduce(
          (sum, r) => sum + r.responseTimeMs,
          0
        );
        const averageResponseTime =
          totalRequests > 0 ? totalResponseTime / totalRequests : 0;

        const requestsByEndpoint: Record<string, number> = {};
        const requestsByStatus: Record<number, number> = {};

        requests.forEach((r) => {
          requestsByEndpoint[r.endpoint] =
            (requestsByEndpoint[r.endpoint] || 0) + 1;
          requestsByStatus[r.statusCode] =
            (requestsByStatus[r.statusCode] || 0) + 1;
        });

        return {
          totalRequests,
          successfulRequests,
          failedRequests,
          averageResponseTime: Math.round(averageResponseTime),
          requestsByEndpoint,
          requestsByStatus,
          requestsByHour: get().getHourlyStats(24),
        };
      },

      getHourlyStats: (hours = 24) => {
        const now = new Date();
        const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
        const requests = get().requests.filter(
          (r) => new Date(r.timestamp) >= cutoff
        );

        const hourlyMap = new Map<string, APIRequest[]>();

        requests.forEach((r) => {
          const date = new Date(r.timestamp);
          const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;

          if (!hourlyMap.has(hourKey)) {
            hourlyMap.set(hourKey, []);
          }
          hourlyMap.get(hourKey)!.push(r);
        });

        const stats: HourlyStats[] = [];

        for (let i = hours - 1; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 60 * 60 * 1000);
          const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;

          const hourRequests = hourlyMap.get(hourKey) || [];
          const errors = hourRequests.filter((r) => r.statusCode >= 400).length;
          const totalTime = hourRequests.reduce(
            (sum, r) => sum + r.responseTimeMs,
            0
          );

          stats.push({
            hour: hourKey,
            requests: hourRequests.length,
            errors,
            avgResponseTime:
              hourRequests.length > 0
                ? Math.round(totalTime / hourRequests.length)
                : 0,
          });
        }

        return stats;
      },

      getDailyStats: (days = 30) => {
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const requests = get().requests.filter(
          (r) => new Date(r.timestamp) >= cutoff
        );

        const dailyMap = new Map<string, APIRequest[]>();

        requests.forEach((r) => {
          const date = new Date(r.timestamp);
          const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

          if (!dailyMap.has(dayKey)) {
            dailyMap.set(dayKey, []);
          }
          dailyMap.get(dayKey)!.push(r);
        });

        const stats: DailyStats[] = [];

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

          const dayRequests = dailyMap.get(dayKey) || [];
          const errors = dayRequests.filter((r) => r.statusCode >= 400).length;
          const totalTime = dayRequests.reduce(
            (sum, r) => sum + r.responseTimeMs,
            0
          );

          stats.push({
            date: dayKey,
            requests: dayRequests.length,
            errors,
            avgResponseTime:
              dayRequests.length > 0
                ? Math.round(totalTime / dayRequests.length)
                : 0,
          });
        }

        return stats;
      },

      getEndpointStats: () => {
        const requests = get().requests;
        const endpointMap = new Map<string, APIRequest[]>();

        requests.forEach((r) => {
          if (!endpointMap.has(r.endpoint)) {
            endpointMap.set(r.endpoint, []);
          }
          endpointMap.get(r.endpoint)!.push(r);
        });

        const stats: EndpointStats[] = [];

        endpointMap.forEach((reqs, endpoint) => {
          const successful = reqs.filter((r) => r.statusCode < 400).length;
          const responseTimes = reqs
            .map((r) => r.responseTimeMs)
            .sort((a, b) => a - b);
          const totalTime = responseTimes.reduce((sum, t) => sum + t, 0);
          const p95Index = Math.floor(responseTimes.length * 0.95);

          stats.push({
            endpoint,
            requests: reqs.length,
            successRate: (successful / reqs.length) * 100,
            avgResponseTime: Math.round(totalTime / reqs.length),
            p95ResponseTime: responseTimes[p95Index] || 0,
          });
        });

        return stats.sort((a, b) => b.requests - a.requests);
      },

      exportData: (format) => {
        const requests = get().requests;

        if (format === 'json') {
          return JSON.stringify(requests, null, 2);
        }

        // CSV format
        const headers = [
          'id',
          'endpoint',
          'method',
          'statusCode',
          'responseTimeMs',
          'timestamp',
          'error',
        ];
        const rows = requests.map((r) => [
          r.id,
          r.endpoint,
          r.method,
          r.statusCode,
          r.responseTimeMs,
          new Date(r.timestamp).toISOString(),
          r.error || '',
        ]);

        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      },
    }),
    {
      name: 'email-validator-analytics',
      partialize: (state) => ({
        requests: state.requests.slice(0, 5000), // Only persist last 5000 requests
      }),
    }
  )
);
