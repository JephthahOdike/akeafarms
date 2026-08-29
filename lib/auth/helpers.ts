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

  // Platform deactivation — end the session immediately. The signed-out
  // cookie means the next request fails auth.getUser() before reaching here.
  if ((profile as { is_active?: boolean }).is_active === false) {
    await supabase.auth.signOut();
    return null;
  }

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

/** All permission keys currently granted to the signed-in employee (empty for admins/other roles). */
export async function getEmployeePermissions(): Promise<string[]> {
  const u = await getCurrentUser();
  if (!u) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('employee_permissions')
    .select('permission')
    .eq('user_id', u.id);

  return (data ?? []).map((r) => r.permission as string);
}

/**
 * Non-redirecting server-side permission check. Admins implicitly hold every
 * permission; employees must hold the exact grant. Backed by the same
 * has_employee_permission() SQL used by RLS (single source of truth).
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const u = await getCurrentUser();
  if (!u) return false;
  if (u.profile.role === 'admin') return true;
  if (u.profile.role !== 'employee') return false;

  const supabase = await createClient();
  const { data } = await supabase.rpc('has_employee_permission', {
    perm: permission
  });
  return data === true;
}

/**
 * Requires a specific permission (admins always pass; employees need the
 * grant). Redirects to the user's own dashboard otherwise.
 */
export async function requirePermission(
  permission: string
): Promise<AuthedUser> {
  const u = await requireUser();
  const allowed =
    u.profile.role === 'admin'
      ? true
      : u.profile.role === 'employee'
        ? await hasPermission(permission)
        : false;

  if (!allowed) {
    const { redirect } = await import('next/navigation');
    redirect(homeForRole(u.profile.role));
  }
  return u;
}

/** Requires at least ONE of the given permissions (admins always pass). */
export async function requireAnyPermission(
  permissions: string[]
): Promise<AuthedUser> {
  const u = await requireUser();
  let allowed = u.profile.role === 'admin';
  if (!allowed && u.profile.role === 'employee') {
    for (const permission of permissions) {
      if (await hasPermission(permission)) {
        allowed = true;
        break;
      }
    }
  }

  if (!allowed) {
    const { redirect } = await import('next/navigation');
    redirect(homeForRole(u.profile.role));
  }
  return u;
}
