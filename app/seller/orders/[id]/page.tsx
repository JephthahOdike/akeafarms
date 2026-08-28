import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, PackageCheck, Truck } from 'lucide-react';
import { getSellerProfileId } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNaira } from '@/lib/utils';
import { StatusActions } from './status-actions';

export const metadata = { title: 'Order Item Details' };

const STATUS_COLORS: Record<string, string> = {
  created: 'bg-muted text-foreground',
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  accepted: 'bg-teal-100 text-teal-800',
  packed: 'bg-purple-100 text-purple-800',
  dispatched: 'bg-orange-100 text-orange-800',
  in_transit: 'bg-amber-100 text-amber-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-200 text-green-900',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-200 text-gray-700'
};

export default async function SellerOrderItemPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sellerId = await getSellerProfileId();
  if (!sellerId) notFound();

  const supabase = await createClient();

  // Ownership enforced here (application layer) AND by RLS ("order_items read",
  // "tracking read"). A foreign item ID yields zero rows -> notFound().
  const { data: item } = await supabase
    .from('order_items')
    .select(
      `id, quantity, unit_price, line_total, status, tracking_code,
       created_at, updated_at, product_name_snapshot, product_id,
       orders!inner(id, order_number, created_at,
         shipping_addresses(recipient_name, phone, city, state, address_line1))
    `
    )
    .eq('id', id)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (!item) notFound();

  const order = item.orders as any;
  const addr = order?.shipping_addresses as any;

  // Tracking timeline for this specific order item.
  const { data: events } = await supabase
    .from('tracking_events')
    .select('id, status, message, location, occurred_at')
    .eq('order_item_id', item.id)
    .order('occurred_at', { ascending: true });

  return (
    <div>
      <Link
        href="/seller/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-3.5" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Order #{order?.order_number}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Placed {new Date(order?.created_at ?? item.created_at).toLocaleDateString('en-NG', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
            STATUS_COLORS[item.status] ?? 'bg-muted'
          }`}
        >
          {(item.status as string)?.replace('_', ' ')}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageCheck className="size-4 text-primary" /> Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{item.product_name_snapshot}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unit price</dt>
                <dd>{formatNaira(item.unit_price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Quantity</dt>
                <dd>{item.quantity}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <dt>Line total</dt>
                <dd>{formatNaira(item.line_total)}</dd>
              </div>
              {item.tracking_code && (
                <div className="flex justify-between pt-1">
                  <dt className="text-muted-foreground">Tracking code</dt>
                  <dd className="font-mono">{item.tracking_code}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="size-4 text-primary" /> Delivery address
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {addr ? (
              <div className="space-y-1">
                <p className="font-medium">{addr.recipient_name}</p>
                {addr.phone && (
                  <p className="text-muted-foreground">{addr.phone}</p>
                )}
                <p className="text-muted-foreground">
                  {[addr.address_line1, addr.city, addr.state]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Address unavailable.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Order progress</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusActions itemId={item.id} status={item.status as string} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="size-4 text-primary" /> Tracking timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <ol className="relative ml-2 border-l border-border space-y-5">
              {events.map((ev) => (
                <li key={ev.id} className="ml-5">
                  <span
                    className="absolute -left-[7px] mt-1.5 size-3 rounded-full bg-primary"
                    aria-hidden
                  />
                  <p className="text-sm font-semibold capitalize">
                    {(ev.status as string)?.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-muted-foreground">{ev.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(ev.occurred_at).toLocaleString('en-NG')}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-6 text-sm text-center text-muted-foreground">
              No tracking updates yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
