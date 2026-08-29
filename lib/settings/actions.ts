/**
 * Akea Farms — Settings Server Actions
 *
 * All settings mutations go through here.
 * Every action verifies the authenticated user's identity server-side.
 * NEVER trusts a userId from the client.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, getCurrentUser } from '@/lib/auth/helpers';
import { isEmployeePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/audit';
import { uploadAvatar } from './avatar';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences as readNotificationPreferences,
  type NotificationPreferences
} from '@/lib/notifications/preferences';

// Re-export for client components that import the type from settings/actions
export type { NotificationPreferences } from '@/lib/notifications/preferences';

/* ------------------------------------------------------------------ */
/*  Validation schemas                                                 */
/* ------------------------------------------------------------------ */

const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters')
    .trim(),
  phone: z
    .string()
    .regex(
      /^(\+234|0)?[7-9][0-1]\d{8}$/,
      'Enter a valid Nigerian phone number (e.g. 08029965942)'
    )
    .optional()
    .or(z.literal(''))
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string()
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

const addressSchema = z.object({
  label: z.string().max(50).optional().or(z.literal('')),
  recipient_name: z.string().min(2, 'Recipient name is required').max(100),
  phone: z
    .string()
    .regex(/^(\+234|0)?[7-9][0-1]\d{8}$/, 'Enter a valid phone number'),
  address_line1: z.string().min(3, 'Address is required').max(200),
  address_line2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  country: z.string().default('Nigeria'),
  postal_code: z.string().max(20).optional().or(z.literal('')),
  is_default: z.boolean().optional()
});

export type SettingsActionResult = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/* ------------------------------------------------------------------ */
/*  Profile                                                            */
/* ------------------------------------------------------------------ */

export async function updateProfile(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const raw = {
    full_name: formData.get('full_name'),
    phone: formData.get('phone')
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Please fix the errors below.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((e) => [e.path.join('.'), e.message])
      )
    };
  }

  const { full_name, phone } = parsed.data;

  // Server-side ownership: always use the authenticated user's ID, never formData
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      phone: phone || null
    })
    .eq('id', user.id);

  if (error) {
    console.error('[settings] Profile update error:', error.message);
    return { error: 'Failed to update profile. Please try again.' };
  }

  // Audit log
  logAudit({
    user_id: user.id,
    action: 'PROFILE_UPDATED',
    resource: 'profiles',
    resource_id: user.id,
    metadata: { fields: ['full_name', ...(phone ? ['phone'] : [])] }
  }).catch(() => {});

  revalidatePath(`/${user.profile.role}/settings`);
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Password Change                                                    */
/* ------------------------------------------------------------------ */

export async function changePassword(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const raw = {
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword')
  };

  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Please fix the errors below.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((e) => [e.path.join('.'), e.message])
      )
    };
  }

  // Verify current password by re-authenticating
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword
  });

  if (authErr) {
    return {
      error: 'Current password is incorrect.',
      fieldErrors: { currentPassword: 'Current password is incorrect' }
    };
  }

  // Update password via Supabase Auth
  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.newPassword
  });

  if (updateErr) {
    console.error('[settings] Password update error:', updateErr.message);
    return { error: updateErr.message };
  }

  // Audit log (no password values!)
  logAudit({
    user_id: user.id,
    action: 'PASSWORD_CHANGED',
    resource: 'auth.users',
    resource_id: user.id
  }).catch(() => {});

  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Email Change                                                       */
/* ------------------------------------------------------------------ */

export async function changeEmail(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const newEmail = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!newEmail || !z.string().email().safeParse(newEmail).success) {
    return { error: 'Please enter a valid email address.', fieldErrors: { email: 'Invalid email' } };
  }

  if (!password) {
    return { error: 'Password is required to change email.', fieldErrors: { password: 'Password is required' } };
  }

  // Re-authenticate
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password
  });

  if (authErr) {
    return { error: 'Password is incorrect.', fieldErrors: { password: 'Incorrect password' } };
  }

  // Update email in Supabase Auth (sends verification)
  const { error: updateErr } = await supabase.auth.updateUser({
    email: newEmail
  });

  if (updateErr) {
    console.error('[settings] Email update error:', updateErr.message);
    return { error: updateErr.message };
  }

  // Sync profiles.email
  const service = createServiceClient();
  await service
    .from('profiles')
    .update({ email: newEmail })
    .eq('id', user.id);

  logAudit({
    user_id: user.id,
    action: 'EMAIL_CHANGE_REQUESTED',
    resource: 'auth.users',
    resource_id: user.id,
    metadata: { verified: false }
  }).catch(() => {});

  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Address CRUD                                                       */
/* ------------------------------------------------------------------ */

export async function createAddress(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  raw.is_default = formData.get('is_default') === 'true';

  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Please fix the errors below.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((e) => [e.path.join('.'), e.message])
      )
    };
  }

  // If setting as default, unset any existing defaults
  if (parsed.data.is_default) {
    await supabase
      .from('shipping_addresses')
      .update({ is_default: false })
      .eq('user_id', user.id);
  }

  const { error } = await supabase
    .from('shipping_addresses')
    .insert({
      user_id: user.id,
      ...parsed.data
    });

  if (error) {
    console.error('[settings] Address create error:', error.message);
    return { error: 'Failed to save address.' };
  }

  logAudit({
    user_id: user.id,
    action: 'ADDRESS_CREATED',
    resource: 'shipping_addresses',
    metadata: { city: parsed.data.city, state: parsed.data.state }
  }).catch(() => {});

  revalidatePath('/buyer/addresses');
  return { success: true };
}

export async function updateAddress(
  addressId: string,
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from('shipping_addresses')
    .select('id')
    .eq('id', addressId)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    return { error: 'Address not found.' };
  }

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  raw.is_default = formData.get('is_default') === 'true';

  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Please fix the errors below.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((e) => [e.path.join('.'), e.message])
      )
    };
  }

  if (parsed.data.is_default) {
    await supabase
      .from('shipping_addresses')
      .update({ is_default: false })
      .eq('user_id', user.id);
  }

  const { error } = await supabase
    .from('shipping_addresses')
    .update(parsed.data)
    .eq('id', addressId)
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Failed to update address.' };
  }

  logAudit({
    user_id: user.id,
    action: 'ADDRESS_UPDATED',
    resource: 'shipping_addresses',
    resource_id: addressId
  }).catch(() => {});

  revalidatePath('/buyer/addresses');
  return { success: true };
}

export async function deleteAddress(
  addressId: string
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('shipping_addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Failed to delete address.' };
  }

  logAudit({
    user_id: user.id,
    action: 'ADDRESS_DELETED',
    resource: 'shipping_addresses',
    resource_id: addressId
  }).catch(() => {});

  revalidatePath('/buyer/addresses');
  return { success: true };
}

export async function setDefaultAddress(
  addressId: string
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Unset all defaults for this user
  await supabase
    .from('shipping_addresses')
    .update({ is_default: false })
    .eq('user_id', user.id);

  // Set the new default
  const { error } = await supabase
    .from('shipping_addresses')
    .update({ is_default: true })
    .eq('id', addressId)
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Failed to set default address.' };
  }

  revalidatePath('/buyer/addresses');
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Deactivation                                                       */
/* ------------------------------------------------------------------ */

export async function deactivateAccount(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const password = formData.get('password') as string;
  const reason = formData.get('reason') as string;

  if (!password) {
    return { error: 'Password is required to deactivate your account.' };
  }

  // Re-authenticate
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password
  });

  if (authErr) {
    return { error: 'Password is incorrect.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', user.id);

  if (error) {
    return { error: 'Failed to deactivate account.' };
  }

  logAudit({
    user_id: user.id,
    action: 'ACCOUNT_DEACTIVATED',
    resource: 'profiles',
    resource_id: user.id,
    metadata: reason ? { reason } : undefined
  }).catch(() => {});

  // Sign out after deactivation
  await supabase.auth.signOut();

  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Notification Preferences                                           */
/* ------------------------------------------------------------------ */

export async function updateNotificationPreferences(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const prefs: NotificationPreferences = {
    order_updates: formData.get('order_updates') === 'on',
    payment_notifications: formData.get('payment_notifications') === 'on',
    delivery_updates: formData.get('delivery_updates') === 'on',
    promotional_emails: formData.get('promotional_emails') === 'on'
  };

  const { error } = await supabase
    .from('buyer_profiles')
    .upsert(
      {
        user_id: user.id,
        preferences: { notifications: prefs }
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    return { error: 'Failed to save preferences.' };
  }

  revalidatePath(`/${user.profile.role}/settings`);
  return { success: true };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const user = await getCurrentUser();
  if (!user) return DEFAULT_NOTIFICATION_PREFERENCES;

  const supabase = await createClient();
  return readNotificationPreferences(supabase, user.id);
}

/* ------------------------------------------------------------------ */
/*  Seller Bank Info                                                   */
/* ------------------------------------------------------------------ */

export async function updateSellerBankInfo(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  // Ensure user is a seller
  if (user.profile.role !== 'seller') {
    return { error: 'Only sellers can update bank information.' };
  }

  const password = formData.get('password') as string;
  if (!password) {
    return { error: 'Password is required to change bank information.' };
  }

  // Re-authenticate
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password
  });

  if (authErr) {
    return { error: 'Password is incorrect.' };
  }

  const bankName = (formData.get('bank_name') as string)?.trim() || '';
  const accountName = (formData.get('bank_account_name') as string)?.trim() || '';
  const accountNumber = (formData.get('bank_account_number') as string)?.trim() || '';

  if (!bankName || !accountName) {
    return { error: 'Bank name and account name are required.' };
  }

  const bankData: Record<string, string> = {
    bank_name: bankName,
    bank_account_name: accountName
  };

  if (accountNumber) {
    // NUBAN validation — reject anything that is not a plausible numeric
    // account number before it ever reaches the database.
    if (!/^[0-9]{10}$/.test(accountNumber)) {
      return {
        error: 'Account number must be a 10-digit number.',
        fieldErrors: { bank_account_number: 'Enter a valid 10-digit account number.' }
      };
    }
    bankData.bank_account_number = accountNumber;
  }
  // Empty account number = keep the existing one on file.

  const { error } = await supabase
    .from('seller_profiles')
    .update(bankData)
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Failed to update bank information.' };
  }

  logAudit({
    user_id: user.id,
    action: 'SELLER_BANK_DETAILS_UPDATED',
    resource: 'seller_profiles',
    resource_id: user.id
    // Never log full bank account numbers; DB trigger logs last4 only.
  }).catch(() => {});

  revalidatePath('/seller/settings');
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Admin — Platform Configuration (Phase 11)                          */
/* ------------------------------------------------------------------ */

const SUPPORT_EMAIL_KEYS = ['support_email'] as const;
const SUPPORT_PHONE_KEYS = ['support_phone', 'support_whatsapp'] as const;

const platformSettingsSchema = z.object({
  support_email: z
    .string()
    .email('Enter a valid email address')
    .max(200)
    .optional(),
  support_phone: z
    .string()
    .regex(/^(\+234|0)?[7-9][0-1]\d{8}$/, 'Enter a valid Nigerian phone number')
    .optional(),
  support_whatsapp: z
    .string()
    .regex(/^(\+234|0)?[7-9][0-1]\d{8}$/, 'Enter a valid Nigerian phone number')
    .optional(),
  shipping_flat_fee: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a non-negative amount (e.g. 500)')
    .optional(),
  catalog_auto_approve_products: z.enum(['true', 'false']).optional()
});

/**
 * Admin-only platform configuration upsert. Only keys present in the
 * FormData are written, so each settings card can post independently.
 * Values are strictly validated before they touch the database; secrets
 * (API keys etc.) are never accepted through this path — they live in
 * environment variables only.
 */
export async function updatePlatformSettings(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  if (user.profile.role !== 'admin') {
    return { error: 'Only administrators can change platform settings.' };
  }

  const raw: Record<string, string> = {};
  for (const key of [
    ...SUPPORT_EMAIL_KEYS,
    ...SUPPORT_PHONE_KEYS,
    'shipping_flat_fee',
    'catalog_auto_approve_products'
  ]) {
    const value = formData.get(key);
    if (value !== null && String(value).trim() !== '') {
      raw[key] = String(value).trim();
    }
  }

  if (Object.keys(raw).length === 0) {
    return { error: 'Nothing to save.' };
  }

  const parsed = platformSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Please fix the errors below.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((e) => [e.path.join('.'), e.message])
      )
    };
  }

  const supabase = await createClient();
  const updates: { key: string; value: unknown }[] = [];
  const changed: string[] = [];

  if (parsed.data.support_email !== undefined) {
    updates.push({ key: 'support_email', value: parsed.data.support_email });
    changed.push('support_email');
  }
  if (parsed.data.support_phone !== undefined) {
    updates.push({ key: 'support_phone', value: parsed.data.support_phone });
    changed.push('support_phone');
  }
  if (parsed.data.support_whatsapp !== undefined) {
    updates.push({ key: 'support_whatsapp', value: parsed.data.support_whatsapp });
    changed.push('support_whatsapp');
  }
  if (parsed.data.shipping_flat_fee !== undefined) {
    updates.push({ key: 'shipping_flat_fee', value: Number(parsed.data.shipping_flat_fee) });
    changed.push('shipping_flat_fee');
  }
  if (parsed.data.catalog_auto_approve_products !== undefined) {
    updates.push({
      key: 'catalog_auto_approve_products',
      value: parsed.data.catalog_auto_approve_products === 'true'
    });
    changed.push('catalog_auto_approve_products');
  }

  // RLS on platform_settings allows admin writes only; updated_by is the
  // session admin, never a client value.
  const { error } = await supabase.from('platform_settings').upsert(
    updates.map((u) => ({ key: u.key, value: u.value, updated_by: user.id })),
    { onConflict: 'key' }
  );

  if (error) {
    console.error('[admin] Platform settings update error:', error.message);
    return { error: 'Failed to save platform settings.' };
  }

  logAudit({
    user_id: user.id,
    action: 'PLATFORM_SETTINGS_UPDATED',
    resource: 'platform_settings',
    metadata: { keys: changed }
  }).catch(() => {});

  revalidatePath('/admin/settings');
  revalidatePath('/admin/support');
  revalidatePath('/contact');
  revalidatePath('/checkout');
  return { success: true };
}

/**
 * Admin-only announcement broadcast: creates an in-app notification for
 * every active profile (batched through the service client, since user
 * clients are RLS-confined to their own rows). Announcements are always
 * delivered in-app (notification type 'announcement' is not preference-
 * gated). Deliberately NOT emailed — bulk unsolicited email is out of
 * scope for the Brevo transactional setup.
 */
export async function sendPlatformAnnouncement(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  if (user.profile.role !== 'admin') {
    return { error: 'Only administrators can send announcements.' };
  }

  const subject = String(formData.get('subject') ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 120);
  const message = String(formData.get('message') ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 1000);

  if (subject.length < 3) {
    return { error: 'Please fix the errors below.', fieldErrors: { subject: 'Subject must be at least 3 characters.' } };
  }
  if (message.length < 3) {
    return { error: 'Please fix the errors below.', fieldErrors: { message: 'Message must be at least 3 characters.' } };
  }

  const service = createServiceClient();

  // Active profiles only — deactivated accounts must not receive anything.
  const { data: profiles, error: profilesErr } = await service
    .from('profiles')
    .select('id')
    .eq('is_active', true);

  if (profilesErr || !profiles) {
    console.error('[admin] Announcement recipients error:', profilesErr?.message);
    return { error: 'Failed to load announcement recipients.' };
  }

  const BATCH_SIZE = 500;
  const rows = (profiles as { id: string }[]).map((p) => ({
    user_id: p.id,
    type: 'announcement' as const,
    title: subject,
    body: message
  }));

  let delivered = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error: insertErr } = await service.from('notifications').insert(batch);
    if (insertErr) {
      console.error('[admin] Announcement batch insert error:', insertErr.message);
      return { error: `Announcement partially failed after ${delivered} deliveries.` };
    }
    delivered += batch.length;
  }

  logAudit({
    user_id: user.id,
    action: 'PLATFORM_ANNOUNCEMENT_SENT',
    resource: 'notifications',
    metadata: { subject, recipients: delivered }
  }).catch(() => {});

  revalidatePath('/admin/settings');
  return { success: true, fieldErrors: { delivered: String(delivered) } };
}

/* ------------------------------------------------------------------ */
/*  Admin — Employee Management                                        */
/* ------------------------------------------------------------------ */

const AVAILABLE_PERMISSIONS = [
  'users.view',
  'sellers.view',
  'sellers.manage',
  'products.view',
  'products.manage',
  'orders.view',
  'orders.manage',
  'payments.view',
  'settlements.view',
  'tracking.manage',
  'support.manage',
  'messages.view',
  'reports.view'
] as const;

export type EmployeeWithPermissions = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  permissions: string[];
};

export async function getEmployees(): Promise<EmployeeWithPermissions[]> {
  const user = await requireUser();
  if (user.profile.role !== 'admin') return [];

  const supabase = await createClient();

  // Get all non-admin profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .neq('role', 'admin')
    .order('created_at', { ascending: false });

  if (!profiles) return [];

  // Get all employee permissions
  const { data: perms } = await supabase
    .from('employee_permissions')
    .select('user_id, permission');

  const permMap = new Map<string, string[]>();
  (perms || []).forEach((p) => {
    const existing = permMap.get(p.user_id) || [];
    existing.push(p.permission);
    permMap.set(p.user_id, existing);
  });

  return profiles.map((p) => ({
    ...p,
    is_active: (p as { is_active?: boolean }).is_active !== false,
    permissions: permMap.get(p.id) || []
  }));
}

export async function grantPermission(
  employeeId: string,
  permission: string
): Promise<SettingsActionResult> {
  const user = await requireUser();
  if (user.profile.role !== 'admin') {
    return { error: 'Only administrators can manage permissions.' };
  }

  if (!isEmployeePermission(permission)) {
    return { error: 'Unknown permission.' };
  }

  // Target must be an existing employee — never an admin, and never a
  // buyer/seller that could be granted dashboard access without promotion.
  const supabase = await createClient();
  const { data: target } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', employeeId)
    .single();

  if (!target) {
    return { error: 'User not found.' };
  }
  if ((target as { role: string }).role !== 'employee') {
    return { error: 'Permissions can only be granted to employees.' };
  }

  const { error } = await supabase.from('employee_permissions').upsert(
    {
      user_id: employeeId,
      permission,
      granted_by: user.id
    },
    { onConflict: 'user_id,permission', ignoreDuplicates: true }
  );

  if (error) {
    console.error('[admin] Grant permission error:', error.message);
    return { error: 'Failed to grant permission.' };
  }

  logAudit({
    user_id: user.id,
    action: 'PERMISSION_GRANTED',
    resource: 'employee_permissions',
    resource_id: employeeId,
    metadata: { permission }
  }).catch(() => {});

  revalidatePath('/admin/settings');
  return { success: true };
}

export async function revokePermission(
  employeeId: string,
  permission: string
): Promise<SettingsActionResult> {
  const user = await requireUser();
  if (user.profile.role !== 'admin') {
    return { error: 'Only administrators can manage permissions.' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('employee_permissions')
    .delete()
    .eq('user_id', employeeId)
    .eq('permission', permission);

  if (error) {
    console.error('[admin] Revoke permission error:', error.message);
    return { error: 'Failed to revoke permission.' };
  }

  logAudit({
    user_id: user.id,
    action: 'PERMISSION_REVOKED',
    resource: 'employee_permissions',
    resource_id: employeeId,
    metadata: { permission }
  }).catch(() => {});

  revalidatePath('/admin/settings');
  return { success: true };
}

export async function upgradeToEmployee(
  userId: string
): Promise<SettingsActionResult> {
  const user = await requireUser();
  if (user.profile.role !== 'admin') {
    return { error: 'Only administrators can upgrade users.' };
  }

  const supabase = await createClient();

  // Verify target user exists and is not already admin/employee
  const { data: target } = await supabase
    .from('profiles')
    .select('id, role, email')
    .eq('id', userId)
    .single();

  if (!target) {
    return { error: 'User not found.' };
  }

  if (target.role === 'admin') {
    return { error: 'Cannot change an admin to employee.' };
  }

  if (target.role === 'employee') {
    return { error: 'User is already an employee.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'employee' })
    .eq('id', userId);

  if (error) {
    console.error('[admin] Upgrade error:', error.message);
    return { error: 'Failed to upgrade user to employee.' };
  }

  logAudit({
    user_id: user.id,
    action: 'EMPLOYEE_UPGRADED',
    resource: 'profiles',
    resource_id: userId,
    metadata: { previous_role: target.role, email: target.email }
  }).catch(() => {});

  revalidatePath('/admin/settings');
  return { success: true };
}

/**
 * Deactivate an employee account. The employee can no longer log in
 * (enforced in loginAction and getCurrentUser). Permissions are kept so
 * an admin can reactivate later without re-assigning access.
 */
export async function deactivateEmployee(
  userId: string
): Promise<SettingsActionResult> {
  const user = await requireUser();
  if (user.profile.role !== 'admin') {
    return { error: 'Only administrators can deactivate employees.' };
  }

  if (userId === user.id) {
    return { error: 'You cannot deactivate your own account.' };
  }

  const supabase = await createClient();

  const { data: target } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .single();

  if (!target) {
    return { error: 'User not found.' };
  }

  const targetRole = (target as { role: string }).role;
  if (targetRole === 'admin') {
    return { error: 'Cannot deactivate an admin.' };
  }
  if (targetRole !== 'employee') {
    return { error: 'Only employees can be deactivated here.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId);

  if (error) {
    console.error('[admin] Deactivate employee error:', error.message);
    return { error: 'Failed to deactivate employee.' };
  }

  logAudit({
    user_id: user.id,
    action: 'EMPLOYEE_DEACTIVATED',
    resource: 'profiles',
    resource_id: userId,
    metadata: { email: (target as { email: string }).email }
  }).catch(() => {});

  revalidatePath('/admin/settings');
  revalidatePath('/admin/users');
  return { success: true };
}

/** Reactivate a previously deactivated employee. */
export async function reactivateEmployee(
  userId: string
): Promise<SettingsActionResult> {
  const user = await requireUser();
  if (user.profile.role !== 'admin') {
    return { error: 'Only administrators can reactivate employees.' };
  }

  const supabase = await createClient();

  const { data: target } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!target) {
    return { error: 'User not found.' };
  }
  if ((target as { role: string }).role !== 'employee') {
    return { error: 'Only employees can be reactivated here.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', userId);

  if (error) {
    console.error('[admin] Reactivate employee error:', error.message);
    return { error: 'Failed to reactivate employee.' };
  }

  logAudit({
    user_id: user.id,
    action: 'EMPLOYEE_REACTIVATED',
    resource: 'profiles',
    resource_id: userId
  }).catch(() => {});

  revalidatePath('/admin/settings');
  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Remove employee status entirely: role reverts to the pre-promotion role
 * (restored from the EMPLOYEE_UPGRADED audit trail when available) and all
 * granular permissions are revoked.
 */
export async function downgradeEmployee(
  userId: string
): Promise<SettingsActionResult> {
  const user = await requireUser();
  if (user.profile.role !== 'admin') {
    return { error: 'Only administrators can remove employee access.' };
  }

  const supabase = await createClient();

  const { data: target } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .single();

  if (!target) {
    return { error: 'User not found.' };
  }

  const targetRole = (target as { role: string }).role;
  if (targetRole === 'admin') {
    return { error: 'Cannot change an admin.' };
  }
  if (targetRole !== 'employee') {
    return { error: 'User is not an employee.' };
  }

  // Restore the role the user held before promotion, when recorded.
  const { data: upgradeAudit } = await supabase
    .from('audit_logs')
    .select('metadata')
    .eq('action', 'EMPLOYEE_UPGRADED')
    .eq('resource_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousRole =
    (upgradeAudit?.metadata as { previous_role?: string } | null)
      ?.previous_role ?? 'buyer';
  const restoredRole =
    previousRole === 'seller' || previousRole === 'buyer'
      ? previousRole
      : 'buyer';

  // Revoke all permissions, then change the role.
  const { error: permErr } = await supabase
    .from('employee_permissions')
    .delete()
    .eq('user_id', userId);

  if (permErr) {
    console.error('[admin] Downgrade revoke perms error:', permErr.message);
    return { error: 'Failed to revoke employee permissions.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: restoredRole })
    .eq('id', userId);

  if (error) {
    console.error('[admin] Downgrade error:', error.message);
    return { error: 'Failed to remove employee status.' };
  }

  logAudit({
    user_id: user.id,
    action: 'EMPLOYEE_DOWNGRADED',
    resource: 'profiles',
    resource_id: userId,
    metadata: {
      email: (target as { email: string }).email,
      restored_role: restoredRole
    }
  }).catch(() => {});

  revalidatePath('/admin/settings');
  revalidatePath('/admin/users');
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Seller Business Profile                                            */
/* ------------------------------------------------------------------ */

const businessProfileSchema = z.object({
  business_name: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(200, 'Business name must be under 200 characters')
    .trim(),
  business_type: z.string().max(50).optional().or(z.literal('')),
  cac_number: z.string().max(50).optional().or(z.literal('')),
  tin: z.string().max(50).optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  story: z.string().max(2000).optional().or(z.literal('')),
  years_of_experience: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().min(0).max(99).optional())
});

export type SellerProfile = {
  business_name: string;
  business_type: string | null;
  cac_number: string | null;
  tin: string | null;
  bio: string | null;
  story: string | null;
  years_of_experience: number | null;
  bank_name: string | null;
  bank_account_name: string | null;
  /** Masked for display only — the raw number never leaves the database. */
  bank_account_last4: string | null;
};

export async function getSellerProfile(): Promise<SellerProfile | null> {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== 'seller') return null;

  const supabase = await createClient();
  // The raw bank_account_number is never selected — the database exposes
  // only the generated masked column bank_account_last4, so the full
  // number cannot reach this server action's return boundary at all.
  const { data } = await supabase
    .from('seller_profiles')
    .select(
      'business_name, business_type, cac_number, tin, bio, story, years_of_experience, bank_name, bank_account_name, bank_account_last4'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  return (data as SellerProfile | null) ?? null;
}

export async function updateSellerBusinessProfile(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();

  if (user.profile.role !== 'seller') {
    return { error: 'Only sellers can update business information.' };
  }

  const supabase = await createClient();

  const raw = Object.fromEntries(formData.entries());

  const parsed = businessProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Please fix the errors below.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((e) => [e.path.join('.'), e.message])
      )
    };
  }

  const { error } = await supabase
    .from('seller_profiles')
    .update(parsed.data)
    .eq('user_id', user.id);

  if (error) {
    console.error('[settings] Business profile update error:', error.message);
    return { error: 'Failed to update business profile.' };
  }

  logAudit({
    user_id: user.id,
    action: 'SELLER_BUSINESS_PROFILE_UPDATED',
    resource: 'seller_profiles',
    resource_id: user.id
  }).catch(() => {});

  revalidatePath('/seller/settings');
  return { success: true };
}
