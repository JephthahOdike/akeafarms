import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client (RSC, Server Actions, Route Handlers).
 * Reads & writes session cookies. Do NOT use in middleware.
 *
 * The Database generic is intentionally omitted — see lib/supabase/client.ts
 * for the rationale. Cast query results at the call site.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component (read-only). Safe to ignore
            // because middleware will refresh the session.
          }
        }
      }
    }
  );
}
