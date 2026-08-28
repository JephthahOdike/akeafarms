'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRole } from '@/lib/auth/helpers';
import { logAudit } from '@/lib/audit';
import { sendSellerApproved, sendSellerRejected } from '@/lib/email';

export type SellerActionResult = { success?: boolean; error?: string };

/**
 * Admin seller-management actions.
 *
 * These mutate via the service client (trusted server context) after
 * verifying the caller is an admin. Updating `seller_profiles.status` also
 * keeps the seller's store visibility in sync so suspended/rejected sellers
 * disappear from the marketplace.
 */

async function getSeller(service: ReturnType<typeof createServiceClient>, sellerId: string) {
  const { data } = await service
    .from('seller_profiles')
    .select('id, user_id, status, business_name')
    .eq('id', sellerId)
    .single();
  return data;
}

async function getSellerEmail(
  service: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<string | null> {
  const { data } = await service
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();
  return data?.email ?? null;
}

export async function approveSeller(sellerId: string): Promise<SellerActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const seller = await getSeller(service, sellerId);
  if (!seller) return { error: 'Seller not found.' };

  const now = new Date().toISOString();
  const { error } = await service
    .from('seller_profiles')
    .update({
      status: 'approved',
      approved_at: now,
      approved_by: admin.id,
      suspended_at: null,
      suspended_reason: null
    })
    .eq('id', sellerId);

  if (error) return { error: 'Failed to approve seller.' };

  await service.from('profiles').update({ role: 'seller' }).eq('id', seller.user_id);
  await service
    .from('stores')
    .update({ is_active: true, verification_status: 'approved' })
    .eq('seller_id', sellerId);

  await logAudit({
    user_id: admin.id,
    action: 'seller_approved',
    resource: 'seller_profiles',
    resource_id: sellerId
  });

  // Notify the seller (non-blocking — approval must not fail over email)
  void (async () => {
    try {
      const email = await getSellerEmail(service, seller.user_id);
      if (email && seller.business_name) {
        await sendSellerApproved(email, seller.business_name);
      }
    } catch (e) {
      console.error('[admin/sellers] approval email error:', e);
    }
  })();

  revalidatePath('/admin/sellers');
  return { success: true };
}

export async function rejectSeller(
  sellerId: string,
  reason?: string
): Promise<SellerActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const seller = await getSeller(service, sellerId);
  if (!seller) return { error: 'Seller not found.' };

  const { error } = await service
    .from('seller_profiles')
    .update({
      status: 'rejected',
      approved_at: null,
      approved_by: null,
      suspended_at: null,
      suspended_reason: null
    })
    .eq('id', sellerId);

  if (error) return { error: 'Failed to reject seller.' };

  // Demote to buyer and hide their store
  await service.from('profiles').update({ role: 'buyer' }).eq('id', seller.user_id);
  await service
    .from('stores')
    .update({ is_active: false, verification_status: 'rejected' })
    .eq('seller_id', sellerId);

  await logAudit({
    user_id: admin.id,
    action: 'seller_rejected',
    resource: 'seller_profiles',
    resource_id: sellerId,
    metadata: reason ? { reason } : undefined
  });

  // In-app notification (always recorded; complements the email)
  try {
    await service.from('notifications').insert({
      user_id: seller.user_id,
      type: 'system',
      title: 'Seller application rejected',
      body: reason
        ? `Your seller application was not approved. Reason: ${reason}`
        : 'Your seller application was not approved. Please contact support for more information.',
      link: '/',
      metadata: { seller_id: sellerId, reason: reason ?? null }
    });
  } catch (e) {
    console.error('[admin/sellers] rejection notification error:', e);
  }

  // Notify the seller (non-blocking — rejection must not fail over email)
  void (async () => {
    try {
      const email = await getSellerEmail(service, seller.user_id);
      if (email && seller.business_name) {
        await sendSellerRejected(email, seller.business_name, reason);
      }
    } catch (e) {
      console.error('[admin/sellers] rejection email error:', e);
    }
  })();

  revalidatePath('/admin/sellers');
  return { success: true };
}

export async function suspendSeller(
  sellerId: string,
  reason: string
): Promise<SellerActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const seller = await getSeller(service, sellerId);
  if (!seller) return { error: 'Seller not found.' };

  const { error } = await service
    .from('seller_profiles')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_reason: reason?.trim() || null
    })
    .eq('id', sellerId);

  if (error) return { error: 'Failed to suspend seller.' };

  // Hide store while suspended (keep role so suspension is reversible)
  await service
    .from('stores')
    .update({ is_active: false, verification_status: 'suspended' })
    .eq('seller_id', sellerId);

  await logAudit({
    user_id: admin.id,
    action: 'seller_suspended',
    resource: 'seller_profiles',
    resource_id: sellerId,
    metadata: reason ? { reason } : undefined
  });

  revalidatePath('/admin/sellers');
  return { success: true };
}

export async function unsuspendSeller(sellerId: string): Promise<SellerActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const seller = await getSeller(service, sellerId);
  if (!seller) return { error: 'Seller not found.' };

  const { error } = await service
    .from('seller_profiles')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      suspended_at: null,
      suspended_reason: null
    })
    .eq('id', sellerId);

  if (error) return { error: 'Failed to unsuspend seller.' };

  await service
    .from('stores')
    .update({ is_active: true, verification_status: 'approved' })
    .eq('seller_id', sellerId);

  await logAudit({
    user_id: admin.id,
    action: 'seller_unsuspended',
    resource: 'seller_profiles',
    resource_id: sellerId
  });

  revalidatePath('/admin/sellers');
  return { success: true };
}
