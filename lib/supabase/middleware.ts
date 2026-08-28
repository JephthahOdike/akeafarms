import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Middleware-friendly Supabase client that refreshes the session cookie
 * on every request. Must be used in `proxy.ts` (Next 16 middleware).
 *
 * The Database generic is intentionally omitted — see lib/supabase/client.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        }
      }
    }
  );

  // IMPORTANT: must call getUser() to refresh the session and populate
  // `auth.getUser()` claims on the request.
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
