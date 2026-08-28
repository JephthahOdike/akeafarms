'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRole } from '@/lib/auth/helpers';
import { logAudit } from '@/lib/audit';
import { sendSettlementPaid } from '@/lib/email';

export type FinanceActionResult = { success?: boolean; error?: string };

const percentageSchema = z.coerce
  .number()
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage must be at most 100');

/* ------------------------------------------------------------------ */
/*  Commission editor                                                  */
/* ------------------------------------------------------------------ */

export async function setGlobalCommission(
  percentage: number
): Promise<FinanceActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const parsed = percentageSchema.safeParse(percentage);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const value = Number(parsed.data.toFixed(2));
  const { data: existing } = await service
    .from('commission_rates')
    .select('id')
    .is('seller_id', null)
    .is('category_id', null)
    .maybeSingle();

  const { error } = existing
    ? await service
        .from('commission_rates')
        .update({ percentage: value })
        .eq('id', existing.id)
    : await service.from('commission_rates').insert({
        seller_id: null,
        category_id: null,
        percentage: value,
        created_by: admin.id
      });

  if (error) return { error: 'Failed to save default commission.' };

  await logAudit({
    user_id: admin.id,
    action: 'commission_updated',
    resource: 'commission_rates',
    metadata: { scope: 'global', percentage: value }
  });

  revalidatePath('/admin/settlements');
  return { success: true };
}

export async function setSellerCommission(
  sellerId: string,
  percentage: number
): Promise<FinanceActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const parsed = percentageSchema.safeParse(percentage);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const value = Number(parsed.data.toFixed(2));
  const { data: existing } = await service
    .from('commission_rates')
    .select('id')
    .eq('seller_id', sellerId)
    .is('category_id', null)
    .maybeSingle();

  const { error } = existing
    ? await service
        .from('commission_rates')
        .update({ percentage: value })
        .eq('id', existing.id)
    : await service.from('commission_rates').insert({
        seller_id: sellerId,
        category_id: null,
        percentage: value,
        created_by: admin.id
      });

  if (error) return { error: 'Failed to save seller commission.' };

  await logAudit({
    user_id: admin.id,
    action: 'commission_updated',
    resource: 'commission_rates',
    resource_id: sellerId,
    metadata: { scope: 'seller', percentage: value }
  });

  revalidatePath('/admin/settlements');
  return { success: true };
}

export async function setCategoryCommission(
  categoryId: string,
  percentage: number
): Promise<FinanceActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const parsed = percentageSchema.safeParse(percentage);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const value = Number(parsed.data.toFixed(2));
  const { data: existing } = await service
    .from('commission_rates')
    .select('id')
    .eq('category_id', categoryId)
    .is('seller_id', null)
    .maybeSingle();

  const { error } = existing
    ? await service
        .from('commission_rates')
        .update({ percentage: value })
        .eq('id', existing.id)
    : await service.from('commission_rates').insert({
        seller_id: null,
        category_id: categoryId,
        percentage: value,
        created_by: admin.id
      });

  if (error) return { error: 'Failed to save category commission.' };

  await logAudit({
    user_id: admin.id,
    action: 'commission_updated',
    resource: 'commission_rates',
    resource_id: categoryId,
    metadata: { scope: 'category', percentage: value }
  });

  revalidatePath('/admin/settlements');
  return { success: true };
}

export async function deleteCommission(
  rateId: string
): Promise<FinanceActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const { error } = await service
    .from('commission_rates')
    .delete()
    .eq('id', rateId);

  if (error) return { error: 'Failed to delete commission override.' };

  await logAudit({
    user_id: admin.id,
    action: 'commission_deleted',
    resource: 'commission_rates',
    resource_id: rateId
  });

  revalidatePath('/admin/settlements');
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Settlement approval                                                */
/* ------------------------------------------------------------------ */

export async function approveSettlement(
  settlementId: string
): Promise<FinanceActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const { data: settlement } = await service
    .from('settlements')
    .select('id, status')
    .eq('id', settlementId)
    .single();

  if (!settlement) return { error: 'Settlement not found.' };
  if (settlement.status !== 'pending') {
    return { error: 'Only pending settlements can be approved.' };
  }

  const { error } = await service
    .from('settlements')
    .update({ status: 'approved' })
    .eq('id', settlementId);

  if (error) return { error: 'Failed to approve settlement.' };

  await logAudit({
    user_id: admin.id,
    action: 'settlement_approved',
    resource: 'settlements',
    resource_id: settlementId
  });

  revalidatePath('/admin/settlements');
  return { success: true };
}

export async function rejectSettlement(
  settlementId: string,
  reason: string
): Promise<FinanceActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const { data: settlement } = await service
    .from('settlements')
    .select('id, status')
    .eq('id', settlementId)
    .single();

  if (!settlement) return { error: 'Settlement not found.' };
  if (settlement.status !== 'pending') {
    return { error: 'Only pending settlements can be rejected.' };
  }

  const { error } = await service
    .from('settlements')
    .update({
      status: 'rejected',
      rejection_reason: reason?.trim() || null
    })
    .eq('id', settlementId);

  if (error) return { error: 'Failed to reject settlement.' };

  await logAudit({
    user_id: admin.id,
    action: 'settlement_rejected',
    resource: 'settlements',
    resource_id: settlementId,
    metadata: reason ? { reason } : undefined
  });

  revalidatePath('/admin/settlements');
  return { success: true };
}

export async function markSettlementPaid(
  settlementId: string
): Promise<FinanceActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const { data: settlement } = await service
    .from('settlements')
    .select('id, status, settlement_number, amount, seller_id')
    .eq('id', settlementId)
    .single();

  if (!settlement) return { error: 'Settlement not found.' };
  if (settlement.status !== 'approved') {
    return { error: 'Only approved settlements can be marked paid.' };
  }

  const { error } = await service
    .from('settlements')
    .update({
      status: 'paid',
      processed_at: new Date().toISOString(),
      processed_by: admin.id
    })
    .eq('id', settlementId);

  if (error) return { error: 'Failed to mark settlement as paid.' };

  await logAudit({
    user_id: admin.id,
    action: 'settlement_paid',
    resource: 'settlements',
    resource_id: settlementId
  });

  // Notify the seller (non-blocking — settlement must not fail over email).
  // Amount comes from the server-side settlement row, never the client.
  const amountFormatted = `₦${Number(settlement.amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
  void (async () => {
    try {
      const { data: sellerProfile } = await service
        .from('seller_profiles')
        .select('user_id, business_name')
        .eq('id', settlement.seller_id)
        .single();
      if (!sellerProfile) return;

      // In-app notification (best effort — always recorded before the email)
      try {
        await service.from('notifications').insert({
          user_id: sellerProfile.user_id,
          type: 'settlement',
          title: `Settlement ${settlement.settlement_number} paid`,
          body: `Your settlement of ${amountFormatted} has been paid to your bank account.`,
          link: '/seller/wallet',
          metadata: { settlement_id: settlementId }
        });
      } catch (e) {
        console.error('[admin/finance] settlement notification error:', e);
      }

      const { data: profile } = await service
        .from('profiles')
        .select('email')
        .eq('id', sellerProfile.user_id)
        .single();
      if (profile?.email) {
        await sendSettlementPaid(
          profile.email,
          settlement.settlement_number,
          amountFormatted
        );
      }
    } catch (e) {
      console.error('[admin/finance] settlement email error:', e);
    }
  })();

  revalidatePath('/admin/settlements');
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Payment refund preparation                                         */
/* ------------------------------------------------------------------ */

export async function refundPayment(
  paymentId: string
): Promise<FinanceActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const { data: payment } = await service
    .from('payments')
    .select('id, order_id, status, amount, provider_reference')
    .eq('id', paymentId)
    .single();

  if (!payment) return { error: 'Payment not found.' };
  if (payment.status === 'refunded') return { success: true };
  if (payment.status !== 'success') {
    return { error: 'Only successful payments can be refunded.' };
  }

  // Mark the payment and its order as refunded.
  const { error } = await service
    .from('payments')
    .update({ status: 'refunded' })
    .eq('id', paymentId);

  if (error) return { error: 'Failed to refund payment.' };

  await service
    .from('orders')
    .update({ status: 'refunded' })
    .eq('id', payment.order_id);

  await logAudit({
    user_id: admin.id,
    action: 'payment_refunded',
    resource: 'payments',
    resource_id: paymentId,
    metadata: {
      amount: payment.amount,
      provider_reference: payment.provider_reference,
      order_id: payment.order_id
    }
  });

  revalidatePath('/admin/payments');
  revalidatePath(`/admin/payments/${paymentId}`);
  return { success: true };
}
