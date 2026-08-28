import { Package, ArrowUpRight } from 'lucide-react';
import { getSellerProfileId } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { formatNaira } from '@/lib/utils';
import Link from 'next/link';

export const metadata = { title: 'Seller Orders' };

const ORDER_STATUS_LABELS: Record<string, string> = {
  created: 'New', pending: 'Pending', paid: 'Paid',
  processing: 'Processing', accepted: 'Accepted', packed: 'Packed',
  dispatched: 'Dispatched', in_transit: 'In Transit',
  delivered: 'Delivered', completed: 'Completed',
  cancelled: 'Cancelled', refunded: 'Refunded'
};

export default async function SellerOrdersPage() {
  const sellerId = await getSellerProfileId();
  if (!sellerId) return null;
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('order_items')
    .select(
      `id, status, quantity, line_total, created_at,
       product_name_snapshot, product_id, unit_price,
       orders!inner(id, order_number, status, buyer_id,
         shipping_addresses(recipient_name, city, state))`
    )
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage orders for your products.</p>
      </div>

      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => {
            const order = item.orders as any;
            const addr = order?.shipping_addresses as any;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">#{order?.order_number}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{item.product_name_snapshot}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {formatNaira(item.unit_price)} = {formatNaira(item.line_total)}
                    </p>
                    {addr?.recipient_name && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ship to: {addr.recipient_name}
                        {addr.city ? `, ${addr.city}` : ''}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/seller/orders/${item.id}`}
                    className="shrink-0 text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Details <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
          <Package className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No orders yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">Orders for your products will appear here.</p>
        </div>
      )}
    </div>
  );
}
