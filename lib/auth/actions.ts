'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { homeForRole, type AuthedUser } from './helpers';
import { slugify } from '@/lib/utils';
import { logAdminLogin, logAudit } from '@/lib/audit';
import { sendAdminNewSellerApplication, sendWelcomeEmail } from '@/lib/email';
import type { UserRole } from '@/lib/types/database';

/* ------------------------------------------------------------------ */
/*  Shared schemas                                                     */
/* ------------------------------------------------------------------ */

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long');
const phoneSchema = z
  .string()
  .regex(/^(\+?234|0)[789]\d{9}$/, 'Please enter a valid Nigerian phone number')
  .optional()
  .or(z.literal(''));

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().min(2, 'Full name is required').max(120),
  phone: phoneSchema,
  role: z.enum(['buyer', 'seller'])
});

const sellerApplicationSchema = z.object({
  business_name: z.string().min(2, 'Business name is required').max(160),
  business_type: z.string().min(2, 'Business type is required').max(80),
  cac_number: z.string().max(40).optional().or(z.literal('')),
  tin: z.string().max(40).optional().or(z.literal('')),
  bio: z.string().max(800).optional().or(z.literal('')),
  years_of_experience: z.coerce.number().int().min(0).max(80).optional(),
  store_name: z.string().min(2, 'Store name is required').max(120),
  store_description: z.string().max(2000).optional().or(z.literal('')),
  farm_name: z.string().max(160).optional().or(z.literal('')),
  farm_state: z.string().max(80).optional().or(z.literal('')),
  farm_lga: z.string().max(120).optional().or(z.literal('')),
  farm_location: z.string().max(200).optional().or(z.literal(''))
});

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/* ------------------------------------------------------------------ */
/*  Login                                                              */
/* ------------------------------------------------------------------ */

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password')
  });
  if (!parsed.success) {
    return {
      error: 'Please check your email and password and try again.'
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: 'Invalid email or password.' };
  }

  // Look up the user's role and redirect accordingly
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .single();

  // Deactivated accounts are refused at the door.
  if (profile && (profile as { is_active?: boolean }).is_active === false) {
    await supabase.auth.signOut();
    return { error: 'This account has been deactivated. Contact support.' };
  }

  // Audit: log admin logins
  const role = (profile?.role as UserRole) ?? 'buyer';
  if (role === 'admin' && user) {
    logAdminLogin(user.id).catch(() => {});
  }

  revalidatePath('/', 'layout');
  redirect(homeForRole(role));
}

/* ------------------------------------------------------------------ */
/*  Register                                                           */
/* ------------------------------------------------------------------ */

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
    phone: formData.get('phone') || undefined,
    role: formData.get('role') ?? 'buyer'
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { fieldErrors, error: 'Please fix the highlighted fields.' };
  }

  const { email, password, full_name, phone, role } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone, role }
    }
  });

  if (error) {
    return { error: error.message };
  }

  // Welcome email (non-blocking — never fail registration over email)
  void (async () => {
    try {
      await sendWelcomeEmail(email, full_name);
    } catch (e) {
      console.error('[register] welcome email error:', e);
    }
  })();

  // For email-confirm-disabled projects, the session is established immediately.
  // We still need to make sure the profile row exists (the trigger does this).
  if (!data.session) {
    return {
      ok: true,
      error:
        'Account created. Please check your email to confirm before signing in.'
    };
  }

  if (role === 'seller') {
    redirect('/register/seller');
  }
  revalidatePath('/', 'layout');
  redirect(homeForRole(role));
}

/* ------------------------------------------------------------------ */
/*  Seller application (step 2 of registration)                        */
/* ------------------------------------------------------------------ */

export async function submitSellerApplicationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to apply.' };

  const parsed = sellerApplicationSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { fieldErrors, error: 'Please fix the highlighted fields.' };
  }

  const data = parsed.data;
  const service = createServiceClient();

  // 1. Create seller_profile
  const { data: seller, error: sellerErr } = await service
    .from('seller_profiles')
    .insert({
      user_id: user.id,
      business_name: data.business_name,
      business_type: data.business_type,
      cac_number: data.cac_number || null,
      tin: data.tin || null,
      bio: data.bio || null,
      years_of_experience: data.years_of_experience ?? null
    })
    .select('id')
    .single();
  if (sellerErr || !seller) {
    return { error: sellerErr?.message ?? 'Could not create seller profile.' };
  }

  // 2. Create store
  const baseSlug = slugify(data.store_name);
  const slug = await ensureUniqueSlug(service, baseSlug);

  const { error: storeErr } = await service.from('stores').insert({
    seller_id: seller.id,
    name: data.store_name,
    slug,
    description: data.store_description || null,
    farm_name: data.farm_name || null,
    farm_state: data.farm_state || null,
    farm_lga: data.farm_lga || null,
    farm_location: data.farm_location || null
  });
  if (storeErr) {
    return { error: storeErr.message };
  }

  // 3. Create the wallet (so balances work out of the box)
  await service.from('seller_wallets').insert({ seller_id: seller.id });

  // 4. Promote the user's role to seller (admins can later demote if rejected)
  await service
    .from('profiles')
    .update({ role: 'seller' })
    .eq('id', user.id);

  // Audit: log seller application
  logAudit({
    user_id: user.id,
    action: 'seller_application_submitted',
    resource: 'seller_profiles',
    resource_id: seller.id,
    metadata: { business_name: data.business_name, store_name: data.store_name }
  }).catch(() => {});

  // Notify admins of the pending application (non-blocking)
  void (async () => {
    try {
      const { data: admins } = await service
        .from('profiles')
        .select('id, email')
        .eq('role', 'admin');

      // In-app notifications for admins (best effort)
      if (admins && admins.length > 0) {
        try {
          await service.from('notifications').insert(
            admins.map((admin) => ({
              user_id: admin.id,
              type: 'system' as const,
              title: 'New seller application',
              body: `${data.business_name} has applied to become a seller and is awaiting review.`,
              link: '/admin/sellers',
              metadata: { seller_id: seller.id }
            }))
          );
        } catch (e) {
          console.error('[seller-application] notification error:', e);
        }
      }

      for (const admin of admins ?? []) {
        if (admin.email) {
          await sendAdminNewSellerApplication(
            admin.email,
            data.business_name,
            seller.id
          );
        }
      }
    } catch (e) {
      console.error('[seller-application] email error:', e);
    }
  })();

  revalidatePath('/', 'layout');
  redirect('/seller?welcome=1');
}

async function ensureUniqueSlug(
  service: ReturnType<typeof createServiceClient>,
  base: string
): Promise<string> {
  let candidate = base || 'store';
  let i = 1;
  // Try up to 50 times
  while (i < 50) {
    const { data } = await service
      .from('stores')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    i += 1;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/* ------------------------------------------------------------------ */
/*  Sign out                                                           */
/* ------------------------------------------------------------------ */

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

/* ------------------------------------------------------------------ */
/*  Get current user (server-side helper used by layouts)              */
/* ------------------------------------------------------------------ */

export async function getCurrentUserAction(): Promise<AuthedUser | null> {
  const { getCurrentUser } = await import('./helpers');
  return getCurrentUser();
}
