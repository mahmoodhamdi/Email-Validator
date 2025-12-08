import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      validate: 'POST /api/validate',
      validateBulk: 'POST /api/validate-bulk',
      health: 'GET /api/health',
    },
  });
}
