'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRole, getSellerProfileId } from '@/lib/auth/helpers';
import { shouldNotify } from '@/lib/notifications/preferences';
import {
  sendOrderStatusUpdate,
  sendDispatchNotification,
  sendDeliveryNotification
} from '@/lib/email';
import type { NotificationType, OrderStatus, TrackingColor } from '@/lib/types/database';

export type OrderStatusActionResult = { success?: boolean; error?: string };

/**
 * Seller order-status transitions.
 *
 * Phase 6: these are the real business events that trigger buyer
 * "order processing", "dispatch" and "delivery" emails + in-app
 * notifications. Sellers can only transition items they own
 * (application check here + "order_items seller update" RLS policy).
 */

type SellerItemStatus = Extract<OrderStatus, 'seller_accepted' | 'dispatched' | 'delivered'>;

/** Allowed source statuses for each transition. */
const ALLOWED_FROM: Record<SellerItemStatus, OrderStatus[]> = {
  seller_accepted: ['paid', 'created'],
  dispatched: ['seller_accepted', 'packed', 'paid'],
  delivered: ['dispatched', 'in_transit', 'packed', 'seller_accepted']
};

const STATUS_META: Record<
  SellerItemStatus,
  {
    color: TrackingColor;
    label: string;
    message: string;
    notificationType: NotificationType;
  }
> = {
  seller_accepted: {
    color: 'blue',
    label: 'Processing',
    message: 'The seller has accepted your order and is preparing it for dispatch.',
    notificationType: 'order'
  },
  dispatched: {
    color: 'green',
    label: 'Dispatched',
    message: 'Your order has been dispatched and is on its way.',
    notificationType: 'shipment'
  },
  delivered: {
    color: 'green',
    label: 'Delivered',
    message: 'Your order has been delivered.',
    notificationType: 'shipment'
  }
};

async function transitionOrderItem(
  itemId: string,
  nextStatus: SellerItemStatus,
  opts?: { trackingCode?: string; location?: string }
): Promise<OrderStatusActionResult> {
  await requireRole('seller');
  const sellerId = await getSellerProfileId();
  if (!sellerId) return { error: 'Seller account not found.' };

  const supabase = await createClient();

  // Ownership check: item must belong to this seller (RLS also enforces).
  const { data: item } = await supabase
    .from('order_items')
    .select('id, status, order_id, tracking_code, orders!inner(order_number, buyer_id)')
    .eq('id', itemId)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (!item) return { error: 'Order item not found.' };

  const currentStatus = item.status as OrderStatus;
  if (currentStatus === nextStatus) return { success: true }; // idempotent
  if (!ALLOWED_FROM[nextStatus].includes(currentStatus)) {
    return {
      error: `Cannot mark order as ${STATUS_META[nextStatus].label.toLowerCase()} from its current status.`
    };
  }

  // 1. Update the order item status (and tracking code if provided)
  const update: { status: OrderStatus; tracking_code?: string } = { status: nextStatus };
  const trackingCode = opts?.trackingCode?.trim();
  if (trackingCode) update.tracking_code = trackingCode;

  const { error: updErr } = await supabase
    .from('order_items')
    .update(update)
    .eq('id', itemId);
  if (updErr) return { error: 'Failed to update order status.' };

  // 2. Record the tracking timeline event
  await supabase.from('tracking_events').insert({
    order_item_id: itemId,
    status: nextStatus,
    color: STATUS_META[nextStatus].color,
    message: STATUS_META[nextStatus].message,
    location: opts?.location?.trim() || null
  });

  // 3. When every item is delivered, sync the parent order status.
  //    Uses the service client because sellers cannot update the orders
  //    table under RLS ("orders buyer update" allows buyer/admin only).
  const order = item.orders as unknown as { order_number: string; buyer_id: string };
  if (nextStatus === 'delivered') {
    try {
      const service = createServiceClient();
      const { data: remaining } = await service
        .from('order_items')
        .select('id')
        .eq('order_id', item.order_id)
        .neq('status', 'delivered');
      if (!remaining || remaining.length === 0) {
        await service
          .from('orders')
          .update({ status: 'delivered' })
          .eq('id', item.order_id);
      }
    } catch (e) {
      console.error('[orders] parent-order sync error:', e);
    }
  }

  // 4. In-app notification for the buyer (always — transactional)
  //    + Brevo email (only if the buyer's preferences permit).
  const meta = STATUS_META[nextStatus];
  const buyerId = order.buyer_id;
  const orderNumber = order.order_number;
  const effectiveTrackingCode = trackingCode || item.tracking_code;

  try {
    const service = createServiceClient();
    await service.from('notifications').insert({
      user_id: buyerId,
      type: meta.notificationType,
      title: `Order ${orderNumber} — ${meta.label}`,
      body: meta.message,
      link: '/buyer/orders',
      metadata: { order_id: item.order_id, order_item_id: itemId }
    });
  } catch (e) {
    console.error('[orders] notification insert error:', e);
  }

  void (async () => {
    try {
      const service = createServiceClient();
      if (!(await shouldNotify(service, buyerId, meta.notificationType))) return;
      const { data: profile } = await service
        .from('profiles')
        .select('email')
        .eq('id', buyerId)
        .single();
      if (!profile?.email) return;

      if (nextStatus === 'seller_accepted') {
        await sendOrderStatusUpdate(profile.email, orderNumber, 'Processing', meta.message);
      } else if (nextStatus === 'dispatched') {
        await sendDispatchNotification(profile.email, orderNumber, effectiveTrackingCode ?? undefined);
      } else {
        await sendDeliveryNotification(profile.email, orderNumber);
      }
    } catch (e) {
      console.error('[orders] buyer email error:', e);
    }
  })();

  revalidatePath('/seller/orders');
  revalidatePath(`/seller/orders/${itemId}`);
  revalidatePath('/buyer/orders');
  return { success: true };
}

/** Seller accepts an order item → starts processing it. */
export async function acceptOrderItem(itemId: string): Promise<OrderStatusActionResult> {
  return transitionOrderItem(itemId, 'seller_accepted');
}

/** Seller dispatches an order item (optionally with tracking code + location). */
export async function dispatchOrderItem(
  itemId: string,
  input: { trackingCode?: string; location?: string } = {}
): Promise<OrderStatusActionResult> {
  return transitionOrderItem(itemId, 'dispatched', input);
}

/** Seller marks an order item as delivered. */
export async function deliverOrderItem(itemId: string): Promise<OrderStatusActionResult> {
  return transitionOrderItem(itemId, 'delivered');
}
