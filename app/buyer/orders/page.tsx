import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { formatNaira } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'My Orders' };

const ORDER_STATUS_LABELS: Record<string, string> = {
  created: 'Awaiting Payment',
  pending: 'Awaiting Payment',
  paid: 'Paid',
  processing: 'Processing',
  accepted: 'Accepted',
  packed: 'Packed',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
  damaged: 'Damaged',
  returned: 'Returned'
};

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-purple-100 text-purple-800',
  packed: 'bg-indigo-100 text-indigo-800',
  dispatched: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-sky-100 text-sky-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
  damaged: 'bg-red-100 text-red-800',
  returned: 'bg-orange-100 text-orange-800'
};

export default async function BuyerOrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select(
      `id, order_number, status, total_amount, currency, created_at, paid_at,
       order_items(count),
       shipping_addresses(recipient_name, city, state)`
    )
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Track and manage your orders.</p>
      </div>

      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const items = order.order_items as any[];
            const addr = order.shipping_addresses as any;
            return (
              <div
                key={order.id}
                className="rounded-xl border border-border bg-card p-4 sm:p-5 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">#{order.order_number}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[order.status] || 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {items?.length ?? 0} item{(items?.length ?? 0) !== 1 ? 's' : ''}
                      {addr?.city ? ` · ${addr.city}` : ''}
                      {addr?.state ? `, ${addr.state}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{formatNaira(order.total_amount)}</p>
                    <Link
                      href={`/buyer/orders/${order.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View details
                      <ChevronRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
          <Package className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No orders yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You haven't placed any orders yet. Start shopping!
          </p>
          <Button asChild className="mt-4">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
