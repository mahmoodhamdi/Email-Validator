import { NextRequest, NextResponse } from 'next/server';

/**
 * CSP violation report structure.
 * Based on the CSP Level 2 specification.
 */
interface CSPViolationReport {
  'csp-report'?: {
    'document-uri'?: string;
    'referrer'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'original-policy'?: string;
    'blocked-uri'?: string;
    'status-code'?: number;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
  };
}

/**
 * Sanitize a string for logging.
 * Removes potential log injection characters.
 */
function sanitizeForLog(str: string | undefined): string {
  if (!str) {
    return '';
  }
  // Remove newlines, tabs, and other control characters
  return str.replace(/[\r\n\t\x00-\x1F\x7F]/g, ' ').slice(0, 500);
}

/**
 * POST /api/csp-report
 * Receives Content Security Policy violation reports from browsers.
 *
 * Browsers send CSP violation reports to this endpoint when a page
 * violates its Content-Security-Policy.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the report from the request body
    const contentType = request.headers.get('content-type') || '';

    // CSP reports are sent as application/csp-report or application/json
    if (
      !contentType.includes('application/csp-report') &&
      !contentType.includes('application/json')
    ) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    let report: CSPViolationReport;
    try {
      report = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const cspReport = report['csp-report'];

    if (!cspReport) {
      return NextResponse.json(
        { error: 'Invalid CSP report format' },
        { status: 400 }
      );
    }

    // Log the violation (in production, you might want to send to a logging service)
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'csp-violation',
      documentUri: sanitizeForLog(cspReport['document-uri']),
      violatedDirective: sanitizeForLog(cspReport['violated-directive']),
      effectiveDirective: sanitizeForLog(cspReport['effective-directive']),
      blockedUri: sanitizeForLog(cspReport['blocked-uri']),
      sourceFile: sanitizeForLog(cspReport['source-file']),
      lineNumber: cspReport['line-number'],
      columnNumber: cspReport['column-number'],
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.warn('[CSP Violation]', JSON.stringify(logEntry, null, 2));
    } else {
      // In production, log as a single line for log aggregation
      console.warn('[CSP Violation]', JSON.stringify(logEntry));
    }

    // TODO: In production, you might want to:
    // 1. Send to a logging service (e.g., Sentry, Datadog, CloudWatch)
    // 2. Store in a database for analysis
    // 3. Send alerts for suspicious patterns

    // Return 204 No Content (standard response for CSP reports)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[CSP Report Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/csp-report
 * Returns information about the CSP reporting endpoint.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/csp-report',
    description: 'Content Security Policy violation reporting endpoint',
    method: 'POST',
    contentType: 'application/csp-report',
    note: 'This endpoint receives browser CSP violation reports',
  });
}
