/**
 * Analytics Types
 *
 * Type definitions for API usage tracking and analytics
 */

export interface APIRequest {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: Date;
  userAgent?: string;
  apiKey?: string;
  error?: string;
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByStatus: Record<number, number>;
  requestsByHour: HourlyStats[];
}

export interface HourlyStats {
  hour: string;
  requests: number;
  errors: number;
  avgResponseTime: number;
}

export interface DailyStats {
  date: string;
  requests: number;
  errors: number;
  avgResponseTime: number;
}

export interface EndpointStats {
  endpoint: string;
  requests: number;
  successRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
}
