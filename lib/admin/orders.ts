'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRole } from '@/lib/auth/helpers';
import { logAudit } from '@/lib/audit';
import { shouldNotify } from '@/lib/notifications/preferences';
import { sendOrderStatusUpdate } from '@/lib/email';

export type AdminOrderActionResult = { success?: boolean; error?: string };

/**
 * Admin cancels an order that was never paid (status 'created').
 *
 * Safe by design: wallet credits only happen inside process_paystack_charge()
 * after a confirmed payment, so cancelling a pre-payment order has no financial
 * side effects. Paid orders must be handled through Payments management
 * (refund flow) instead.
 */
export async function adminCancelOrder(
  orderId: string
): Promise<AdminOrderActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const { data: order } = await service
    .from('orders')
    .select('id, order_number, status, buyer_id')
    .eq('id', orderId)
    .single();

  if (!order) return { error: 'Order not found.' };
  if (order.status !== 'created') {
    return {
      error:
        'Only unpaid orders can be cancelled. For a paid order, use Payments to issue a refund.'
    };
  }

  const { error } = await service
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    console.error('[admin/orders] cancel error:', error.message);
    return { error: 'Failed to cancel the order.' };
  }

  // Cancel any items that were still awaiting payment.
  await service
    .from('order_items')
    .update({ status: 'cancelled' })
    .eq('order_id', orderId)
    .eq('status', 'created');

  await logAudit({
    user_id: admin.id,
    action: 'order_cancelled',
    resource: 'orders',
    resource_id: orderId,
    metadata: { order_number: order.order_number, actor_role: 'admin' }
  });

  // In-app notification for the buyer (transactional) + email if permitted.
  try {
    await service.from('notifications').insert({
      user_id: order.buyer_id,
      type: 'order',
      title: `Order ${order.order_number} cancelled`,
      body: 'Your order was cancelled by an administrator before payment was completed. You have not been charged.',
      link: '/buyer/orders',
      metadata: { order_id: orderId }
    });
  } catch (e) {
    console.error('[admin/orders] cancel notification error:', e);
  }

  void (async () => {
    try {
      if (!(await shouldNotify(service, order.buyer_id, 'order'))) return;
      const { data: profile } = await service
        .from('profiles')
        .select('email')
        .eq('id', order.buyer_id)
        .single();
      if (!profile?.email) return;
      await sendOrderStatusUpdate(
        profile.email,
        order.order_number,
        'Cancelled',
        'This order was cancelled before payment was completed. You have not been charged.'
      );
    } catch (e) {
      console.error('[admin/orders] cancel email error:', e);
    }
  })();

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/buyer/orders');
  return { success: true };
}

/**
 * Admin marks a fully delivered order as completed (delivered → completed).
 * Post-fulfilment bookkeeping only — no money movement occurs.
 */
export async function adminCompleteOrder(
  orderId: string
): Promise<AdminOrderActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const { data: order } = await service
    .from('orders')
    .select('id, order_number, status, buyer_id')
    .eq('id', orderId)
    .single();

  if (!order) return { error: 'Order not found.' };
  if (order.status !== 'delivered') {
    return { error: 'Only delivered orders can be marked as completed.' };
  }

  const { error } = await service
    .from('orders')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    console.error('[admin/orders] complete error:', error.message);
    return { error: 'Failed to mark the order as completed.' };
  }

  await logAudit({
    user_id: admin.id,
    action: 'order_completed',
    resource: 'orders',
    resource_id: orderId,
    metadata: { order_number: order.order_number, actor_role: 'admin' }
  });

  try {
    await service.from('notifications').insert({
      user_id: order.buyer_id,
      type: 'order',
      title: `Order ${order.order_number} completed`,
      body: 'Your order has been completed. Thank you for shopping with Akea Farms.',
      link: '/buyer/orders',
      metadata: { order_id: orderId }
    });
  } catch (e) {
    console.error('[admin/orders] complete notification error:', e);
  }

  void (async () => {
    try {
      if (!(await shouldNotify(service, order.buyer_id, 'order'))) return;
      const { data: profile } = await service
        .from('profiles')
        .select('email')
        .eq('id', order.buyer_id)
        .single();
      if (!profile?.email) return;
      await sendOrderStatusUpdate(
        profile.email,
        order.order_number,
        'Completed',
        'Your order has been completed. We would love to hear your feedback.'
      );
    } catch (e) {
      console.error('[admin/orders] complete email error:', e);
    }
  })();

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/buyer/orders');
  return { success: true };
}
