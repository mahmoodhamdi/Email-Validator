import { NextRequest, NextResponse } from 'next/server';
import { validateEmail } from '@/lib/validators';
import { MAX_EMAIL_LENGTH } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();

    if (trimmedEmail.length === 0) {
      return NextResponse.json(
        { error: 'Email cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json(
        { error: `Email exceeds maximum length of ${MAX_EMAIL_LENGTH} characters` },
        { status: 400 }
      );
    }

    const result = await validateEmail(trimmedEmail);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Email Validation API',
      usage: 'POST /api/validate with { "email": "test@example.com" }',
    },
    { status: 200 }
  );
}
