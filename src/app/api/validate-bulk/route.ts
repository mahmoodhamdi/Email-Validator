import { NextRequest, NextResponse } from 'next/server';
import { validateEmailBulk } from '@/lib/validators';
import { RATE_LIMITS, MAX_EMAIL_LENGTH } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emails } = body;

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json(
        { error: 'Emails array is required' },
        { status: 400 }
      );
    }

    if (emails.length === 0) {
      return NextResponse.json(
        { error: 'Emails array cannot be empty' },
        { status: 400 }
      );
    }

    if (emails.length > RATE_LIMITS.maxBulkSize) {
      return NextResponse.json(
        { error: `Maximum ${RATE_LIMITS.maxBulkSize} emails allowed per request` },
        { status: 400 }
      );
    }

    // Validate and clean emails
    const validEmails: string[] = [];
    for (const email of emails) {
      if (typeof email !== 'string') continue;
      const trimmed = email.trim();
      if (trimmed.length > 0 && trimmed.length <= MAX_EMAIL_LENGTH) {
        validEmails.push(trimmed);
      }
    }

    if (validEmails.length === 0) {
      return NextResponse.json(
        { error: 'No valid emails provided' },
        { status: 400 }
      );
    }

    // Remove duplicates
    const uniqueEmails = [...new Set(validEmails)];

    const results = await validateEmailBulk(uniqueEmails);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Bulk validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Bulk Email Validation API',
      usage: 'POST /api/validate-bulk with { "emails": ["email1@example.com", "email2@example.com"] }',
      maxEmails: RATE_LIMITS.maxBulkSize,
    },
    { status: 200 }
  );
}
