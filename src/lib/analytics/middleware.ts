/**
 * Analytics Middleware
 *
 * Middleware for tracking API request metrics
 */

import { NextRequest, NextResponse } from 'next/server';

export interface RequestMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: Date;
  userAgent?: string;
  apiKey?: string;
  error?: string;
}

/**
 * Wrap an API handler to track metrics
 */
export function withAnalytics<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  recordMetrics: (metrics: RequestMetrics) => void
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const startTime = performance.now();
    const endpoint = new URL(request.url).pathname;
    const method = request.method;
    const userAgent = request.headers.get('user-agent') || undefined;
    const apiKey = request.headers.get('x-api-key') || undefined;

    let statusCode = 200;
    let error: string | undefined;

    try {
      const response = await handler(request);
      statusCode = response.status;
      return response;
    } catch (err) {
      statusCode = 500;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const responseTimeMs = Math.round(performance.now() - startTime);

      recordMetrics({
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        timestamp: new Date(),
        userAgent,
        apiKey,
        error,
      });
    }
  };
}
