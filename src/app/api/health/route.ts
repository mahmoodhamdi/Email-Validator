import { NextRequest, NextResponse } from 'next/server';
import { getAllCacheStats } from '@/lib/cache';
import { getAllCircuitStats } from '@/lib/utils/circuit-breaker';
import { getCacheWarmingStatus } from '@/lib/cache-warmer';

export async function GET(request: NextRequest) {
  const baseResponse = {
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      validate: 'POST /api/validate',
      validateBulk: 'POST /api/validate-bulk',
      health: 'GET /api/health',
    },
  };

  // Only expose detailed stats when X-Debug header is present
  const showDetails = request.headers.get('x-debug') === 'true';

  if (!showDetails) {
    return NextResponse.json(baseResponse);
  }

  const cacheStats = getAllCacheStats();
  const circuitStats = getAllCircuitStats();
  const warmingStatus = getCacheWarmingStatus();

  const totalHits = Object.values(cacheStats).reduce((sum, s) => sum + s.hits, 0);
  const totalMisses = Object.values(cacheStats).reduce((sum, s) => sum + s.misses, 0);
  const overallHitRate = totalHits + totalMisses > 0
    ? totalHits / (totalHits + totalMisses)
    : 0;

  return NextResponse.json({
    ...baseResponse,
    cache: {
      overallHitRate: Math.round(overallHitRate * 100) / 100,
      caches: cacheStats,
      warming: warmingStatus,
    },
    circuitBreakers: circuitStats,
  });
}
