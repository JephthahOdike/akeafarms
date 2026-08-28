import { Truck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import TrackForm, { TrackingTimeline, TrackingStatusBadge } from '@/components/tracking/track-form';

export const metadata = { title: 'Track Order' };

type SearchParams = Promise<{ order?: string }>;

export default async function TrackPage({ searchParams }: { searchParams: SearchParams }) {
  const { order } = await searchParams;
  const supabase = await createClient();

  let orderData: Record<string, unknown> | null = null;
  let trackingEvents: unknown[] = [];
  let notFound = false;

  if (order) {
    const { data: ord } = await supabase
      .from('orders')
      .select('id, order_number, status, total_amount, currency, created_at, tracking_events(*)')
      .eq('order_number', order)
      .maybeSingle();

    if (ord) {
      orderData = ord as unknown as Record<string, unknown>;
      trackingEvents = (ord.tracking_events as unknown[]) ?? [];
    } else {
      notFound = true;
    }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <Truck className="mx-auto size-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Track Your Order</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your order number to check delivery status.
          </p>
        </div>

        <TrackForm />

        {notFound && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground">
              No order found with that number. Double-check the order number and try again.
            </p>
          </div>
        )}

        {orderData && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Order
                </p>
                <p className="font-mono text-sm font-semibold">
                  {orderData.order_number as string}
                </p>
              </div>
              <TrackingStatusBadge status={orderData.status as string} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Total:{' '}
              <span className="font-semibold text-foreground">
                ₦{(orderData.total_amount as number)?.toLocaleString()}
              </span>
              {' · '}
              {new Date(orderData.created_at as string).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>

            <TrackingTimeline events={trackingEvents as Parameters<typeof TrackingTimeline>[0]['events']} />
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Signed in?{' '}
            <a href="/buyer/orders" className="text-primary hover:underline">
              View all your orders
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
