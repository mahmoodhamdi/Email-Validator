import { NextResponse } from 'next/server';
import { getAllCacheStats } from '@/lib/cache';
import { getAllCircuitStats } from '@/lib/utils/circuit-breaker';
import { getCacheWarmingStatus } from '@/lib/cache-warmer';

export async function GET() {
  const cacheStats = getAllCacheStats();
  const circuitStats = getAllCircuitStats();
  const warmingStatus = getCacheWarmingStatus();

  // Calculate overall cache hit rate
  const totalHits = Object.values(cacheStats).reduce((sum, s) => sum + s.hits, 0);
  const totalMisses = Object.values(cacheStats).reduce((sum, s) => sum + s.misses, 0);
  const overallHitRate = totalHits + totalMisses > 0
    ? totalHits / (totalHits + totalMisses)
    : 0;

  return NextResponse.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      validate: 'POST /api/validate',
      validateBulk: 'POST /api/validate-bulk',
      health: 'GET /api/health',
    },
    cache: {
      overallHitRate: Math.round(overallHitRate * 100) / 100,
      caches: cacheStats,
      warming: warmingStatus,
    },
    circuitBreakers: circuitStats,
  });
}
