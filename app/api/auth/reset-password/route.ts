import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/utils';

/**
 * POST /api/auth/reset-password
 *
 * Sends a password reset email via Supabase Auth.
 * Supabase handles the reset token/link generation internally.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const email = body.get('email') as string;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/login?reset=1`
    });

    // Always return success to prevent email enumeration
    if (error) {
      console.error('[reset-password] Supabase error:', error.message);
    }

    return NextResponse.json({
      ok: true,
      message: 'If an account exists for that email, a reset link has been sent.'
    });
  } catch (e) {
    console.error('[reset-password] Unexpected error:', e);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
