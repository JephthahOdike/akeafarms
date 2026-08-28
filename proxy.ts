import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { homeForRole } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types/database';

const ROLE_PREFIXES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: '/admin', roles: ['admin', 'employee'] },
  { prefix: '/seller', roles: ['seller', 'admin'] },
  { prefix: '/buyer', roles: ['buyer', 'seller', 'admin', 'employee'] }
];

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // 1) Protected dashboards — must be signed in
  for (const { prefix, roles } of ROLE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('next', pathname);
        return Response.redirect(url);
      }
      // If the path belongs to a specific role only, verify role
      if (roles.length > 0 && !roles.includes('buyer')) {
        // Cheap role check via the SSR client (already has session)
        const supabase = await createClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (!profile) {
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          return Response.redirect(url);
        }
        if (!roles.includes(profile.role as UserRole)) {
          const url = request.nextUrl.clone();
          url.pathname = homeForRole(profile.role as UserRole);
          return Response.redirect(url);
        }
      }
    }
  }

  // 2) Logged-in users shouldn't see /login or /register
  if (user && (pathname === '/login' || pathname === '/register')) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const url = request.nextUrl.clone();
    url.pathname = profile
      ? homeForRole(profile.role as UserRole)
      : '/';
    return Response.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /api routes
     * - /_next (Next.js internals)
     * - /_vercel
     * - root files in /public (e.g. /favicon.ico, /robots.txt)
     */
    '/((?!api|_next|_vercel|[\\w-]+\\.\\w+).*)'
  ]
};
