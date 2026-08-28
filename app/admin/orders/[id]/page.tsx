import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Package, CreditCard, MapPin, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';

export const metadata = { title: 'Order Detail' };

const STATUS_COLORS: Record<string, string> = {
  created: 'bg-gray-100 text-gray-800',
  paid: 'bg-blue-100 text-blue-800',
  seller_accepted: 'bg-indigo-100 text-indigo-800',
  packed: 'bg-purple-100 text-purple-800',
  dispatched: 'bg-amber-100 text-amber-800',
  in_transit: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800'
};

export default async function AdminOrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (!order) notFound();

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('created_at');

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  const { data: buyer } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone')
    .eq('id', order.buyer_id)
    .single();

  const { data: address } = order.shipping_address_id
    ? await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('id', order.shipping_address_id)
        .single()
    : { data: null };

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: trackingEvents } = itemIds.length
    ? await supabase
        .from('tracking_events')
        .select('*')
        .in('order_item_id', itemIds)
        .order('occurred_at', { ascending: false })
    : { data: [] };

  const statusBadge = (status: string) =>
    `rounded-full px-2 py-0.5 text-xs font-medium ${
      STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'
    }`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/admin/orders">
              <ArrowLeft className="mr-1 size-4" /> Back to orders
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Order #{order.order_number}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Placed {new Date(order.created_at).toLocaleString('en-NG')}
          </p>
        </div>
        <span className={statusBadge(order.status)}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" /> Buyer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{buyer?.full_name || '—'}</p>
            <p className="text-muted-foreground">{buyer?.email || '—'}</p>
            <p className="text-muted-foreground">{buyer?.phone || '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4" /> Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {address ? (
              <>
                <p className="font-medium">{address.recipient_name}</p>
                <p className="text-muted-foreground">{address.phone}</p>
                <p className="text-muted-foreground">
                  {address.address_line1}
                  {address.address_line2 ? `, ${address.address_line2}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {address.city}, {address.state}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No shipping address.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" /> Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-medium">{formatNaira(order.subtotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Shipping</p>
              <p className="font-medium">{formatNaira(order.shipping_fee)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Discount</p>
              <p className="font-medium">{formatNaira(order.discount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold">{formatNaira(order.total_amount)}</p>
            </div>
          </div>

          {payments?.length ? (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {payments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">
                    Ref: <span className="font-mono">{p.provider_reference}</span>
                  </span>
                  <span className={statusBadge(p.status)}>{p.status}</span>
                  {p.channel && <span className="text-muted-foreground">{p.channel}</span>}
                  {p.paid_at && (
                    <span className="text-muted-foreground">
                      Paid {new Date(p.paid_at).toLocaleString('en-NG')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No payment records.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4" /> Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Product</th>
                  <th className="px-3 py-2 text-left font-medium">Unit Price</th>
                  <th className="px-3 py-2 text-left font-medium">Qty</th>
                  <th className="px-3 py-2 text-left font-medium">Line Total</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Tracking</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">
                      {item.product_name_snapshot}
                    </td>
                    <td className="px-3 py-2">{formatNaira(item.unit_price)}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{formatNaira(item.line_total)}</td>
                    <td className="px-3 py-2">
                      <span className={statusBadge(item.status)}>{item.status}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {item.tracking_code || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {trackingEvents?.length ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Tracking History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trackingEvents.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 text-sm">
                <span
                  className="mt-1 size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: ev.color || '#888' }}
                />
                <div>
                  <p className="font-medium">
                    {ev.status.replace(/_/g, ' ')} — {ev.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.occurred_at).toLocaleString('en-NG')}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
