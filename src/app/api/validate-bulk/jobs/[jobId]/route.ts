import { NextRequest, NextResponse } from 'next/server';
import {
  getJob,
  getJobProgress,
  cancelJob,
  deleteJob,
} from '@/lib/bulk-jobs';
import { HTTP_STATUS } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/validate-bulk/jobs/[jobId]
 * Get the status and results of a bulk validation job.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { jobId } = await params;

  // Check if client wants just progress (lightweight)
  const progressOnly = request.nextUrl.searchParams.get('progress') === 'true';

  if (progressOnly) {
    const progress = getJobProgress(jobId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(progress);
  }

  // Get full job details
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job not found', code: 'JOB_NOT_FOUND' },
      { status: HTTP_STATUS.NOT_FOUND }
    );
  }

  // If job is completed, include results
  if (job.status === 'completed') {
    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      total: job.total,
      results: job.results,
      errors: job.errors,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      processingTimeMs: job.processingTimeMs,
    });
  }

  // For pending/processing jobs, return status without results
  return NextResponse.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    total: job.total,
    percentComplete: job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0,
    errors: job.errors,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
  });
}

/**
 * DELETE /api/validate-bulk/jobs/[jobId]
 * Cancel a running job or delete a completed job.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { jobId } = await params;

  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job not found', code: 'JOB_NOT_FOUND' },
      { status: HTTP_STATUS.NOT_FOUND }
    );
  }

  // If job is processing, cancel it
  if (job.status === 'processing') {
    const cancelled = cancelJob(jobId);

    if (cancelled) {
      return NextResponse.json({
        message: 'Job cancelled',
        id: jobId,
        status: 'cancelled',
      });
    }

    return NextResponse.json(
      { error: 'Failed to cancel job', code: 'CANCEL_FAILED' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }

  // If job is completed/failed/cancelled, delete it
  const deleted = deleteJob(jobId);

  if (deleted) {
    return NextResponse.json({
      message: 'Job deleted',
      id: jobId,
    });
  }

  return NextResponse.json(
    { error: 'Failed to delete job', code: 'DELETE_FAILED' },
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
  );
}
