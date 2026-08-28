import { createClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/lib/types/database';

export type AuthedUser = {
  id: string;
  email: string;
  profile: Profile;
};

/** Returns the current user + profile, or null. */
export async function getCurrentUser(): Promise<AuthedUser | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  return { id: user.id, email: user.email!, profile };
}

/** Resolves the current seller's seller_profiles.id (NOT profiles.id). */
export async function getSellerProfileId(): Promise<string | null> {
  const u = await getCurrentUser();
  if (!u) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('seller_profiles')
    .select('id')
    .eq('user_id', u.id)
    .maybeSingle();

  return data?.id ?? null;
}

/** Throws/redirects to /login if not signed in. */
export async function requireUser(redirectTo = '/login'): Promise<AuthedUser> {
  const u = await getCurrentUser();
  if (!u) {
    const { redirect } = await import('next/navigation');
    redirect(redirectTo);
  }
  // redirect() throws `NEXT_REDIRECT`; TS doesn't know it never returns.
  return u as AuthedUser;
}

/** Requires a specific role; redirects to the user's own dashboard otherwise. */
export async function requireRole(
  role: UserRole | UserRole[]
): Promise<AuthedUser> {
  const u = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(u.profile.role)) {
    const { redirect } = await import('next/navigation');
    redirect(homeForRole(u.profile.role));
  }
  return u;
}

export function homeForRole(role: UserRole) {
  switch (role) {
    case 'admin':
    case 'employee':
      return '/admin';
    case 'seller':
      return '/seller';
    case 'buyer':
    default:
      return '/buyer';
  }
}
