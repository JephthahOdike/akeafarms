import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/invoice/[orderId]
 *
 * Returns an HTML invoice page for the given order.
 * The buyer must own the order, or the caller must be an admin.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const supabase = await createClient();

  // Authenticate
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Authentication required', { status: 401 });
  }

  // Fetch order with items, store, seller, and payment info
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, subtotal, shipping_fee, total_amount,
      currency, created_at,
      shipping_addresses!inner(recipient_name, phone, address_line1, city, state),
      order_items(
        id, product_name_snapshot, unit_price, quantity, line_total,
        store_id,
        stores(name, seller_id)
      ),
      payments(provider_reference, status, created_at)
    `)
    .eq('id', orderId)
    .single();

  if (!order) {
    return new NextResponse('Order not found', { status: 404 });
  }

  // Authorization: buyer owns the order, or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    // Check if buyer owns this order
    const { data: buyerCheck } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .maybeSingle();

    if (!buyerCheck) {
      return new NextResponse('Access denied', { status: 403 });
    }
  }

  // Build invoice HTML
  const payment = order.payments?.[0] as Record<string, unknown> | undefined;
  const addrArr = order.shipping_addresses as unknown as Record<string, unknown>[];
  const addr = addrArr?.[0] ?? {};
  const items = (order.order_items as Record<string, unknown>[]) ?? [];

  // Group items by seller/store
  const sellerIds = Array.from(
    new Set(
      items
        .map((item) => (item.stores as Record<string, unknown>)?.seller_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  let sellerNameById = new Map<string, string>();
  if (sellerIds.length) {
    const { data: sellerRows } = await supabase.rpc('get_public_seller_infos', {
      seller_profile_ids: sellerIds
    });
    sellerNameById = new Map(
      ((sellerRows ?? []) as { id: string; business_name: string | null }[]).map(
        (s) => [s.id, s.business_name ?? 'Unknown']
      )
    );
  }

  const groupedByStore = new Map<string, { storeName: string; sellerName: string; items: Record<string, unknown>[] }>();
  for (const item of items) {
    const store = item.stores as Record<string, unknown>;
    const storeId = (store?.name as string) || 'unknown';
    if (!groupedByStore.has(storeId)) {
      groupedByStore.set(storeId, {
        storeName: store?.name as string || 'Unknown',
        sellerName: sellerNameById.get(store?.seller_id as string) || 'Unknown',
        items: []
      });
    }
    groupedByStore.get(storeId)!.items.push(item);
  }

  const itemRows = Array.from(groupedByStore.entries())
    .map(([, group]) => {
      const rows = group.items
        .map(
          (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">
            ${item.product_name_snapshot}<br/>
            <span style="color:#888;font-size:12px">${group.storeName}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">₦${Number(item.unit_price).toLocaleString()}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">₦${Number(item.line_total).toLocaleString()}</td>
        </tr>`
        )
        .join('');
      return rows;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Invoice ${order.order_number}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:Arial,sans-serif; color:#222; padding:40px; max-width:800px; margin:0 auto }
  .header { display:flex; justify-content:space-between; align-items:start; margin-bottom:32px }
  .brand { font-size:24px; font-weight:bold; color:#0a4d3b }
  .invoice-title { font-size:20px; color:#666 }
  .info { margin-bottom:24px; display:grid; grid-template-columns:1fr 1fr; gap:16px }
  .info-box { padding:12px; background:#f9f9f9; border-radius:8px }
  .info-box h3 { font-size:13px; color:#888; margin-bottom:4px }
  table { width:100%; border-collapse:collapse; margin-bottom:24px }
  th { text-align:left; color:#888; font-size:13px; padding-bottom:8px; border-bottom:2px solid #ddd }
  .totals { margin-left:auto; width:300px }
  .totals td { padding:4px 0 }
  .totals .grand { font-size:18px; font-weight:bold; color:#0a4d3b }
  .footer { margin-top:40px; padding-top:16px; border-top:1px solid #ddd; color:#888; font-size:12px; text-align:center }
  @media print { body { padding:20px } }
</style></head>
<body>
  <div class="header">
    <div>
      <div class="brand">Akea Farms</div>
      <div style="color:#888;font-size:13px">Agricultural Marketplace</div>
    </div>
    <div class="invoice-title">INVOICE</div>
  </div>

  <div class="info">
    <div class="info-box">
      <h3>Order Number</h3>
      <strong>${order.order_number}</strong>
    </div>
    <div class="info-box">
      <h3>Date</h3>
      ${new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
    <div class="info-box">
      <h3>Bill To</h3>
      ${addr.recipient_name}<br/>
      ${addr.phone}<br/>
      ${addr.address_line1}${addr.city ? `, ${addr.city}` : ''}${addr.state ? `, ${addr.state}` : ''}
    </div>
    <div class="info-box">
      <h3>Payment</h3>
      Ref: ${payment?.provider_reference || 'N/A'}<br/>
      Status: ${payment?.status || 'pending'}<br/>
      ${payment?.created_at ? new Date(payment.created_at as string).toLocaleDateString('en-NG') : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td style="text-align:right">₦${Number(order.subtotal).toLocaleString()}</td></tr>
      <tr><td>Shipping</td><td style="text-align:right">₦${Number(order.shipping_fee).toLocaleString()}</td></tr>
      <tr class="grand"><td>Total</td><td style="text-align:right">₦${Number(order.total_amount).toLocaleString()}</td></tr>
    </table>
  </div>

  <div class="footer">
    <p>Akea Farms — Agricultural Marketplace</p>
    <p>help.akeafarms@gmail.com | 08029965942</p>
    <p style="margin-top:8px">This is a computer-generated invoice.</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="invoice-${order.order_number}.html"`
    }
  });
}
