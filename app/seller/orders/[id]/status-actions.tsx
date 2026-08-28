'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, PackageCheck, Truck } from 'lucide-react';
import { acceptOrderItem, dispatchOrderItem, deliverOrderItem } from '@/lib/orders/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Status = string;

export function StatusActions({ itemId, status }: { itemId: string; status: Status }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [location, setLocation] = useState('');

  function run(fn: () => Promise<{ success?: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  }

  const canAccept = status === 'paid' || status === 'created';
  const canDispatch = ['seller_accepted', 'packed', 'paid'].includes(status);
  const canDeliver = ['dispatched', 'in_transit', 'packed', 'seller_accepted'].includes(status);

  if (!canAccept && !canDispatch && !canDeliver && status !== 'delivered') return null;

  return (
    <div className="space-y-3">
      {canAccept && (
        <Button
          disabled={pending}
          onClick={() => run(() => acceptOrderItem(itemId))}
          className="w-full sm:w-auto"
        >
          <PackageCheck className="size-4 mr-1.5" />
          {pending ? 'Updating…' : 'Accept & Start Processing'}
        </Button>
      )}

      {canDispatch && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium">Dispatch this order</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tracking-code">Tracking code (optional)</Label>
              <Input
                id="tracking-code"
                placeholder="e.g. AF-TRK-000123"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dispatch-location">Dispatched from (optional)</Label>
              <Input
                id="dispatch-location"
                placeholder="e.g. Ibadan, Oyo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
          <Button
            disabled={pending}
            onClick={() =>
              run(() =>
                dispatchOrderItem(itemId, {
                  trackingCode: trackingCode || undefined,
                  location: location || undefined
                })
              )
            }
            className="w-full sm:w-auto"
          >
            <Truck className="size-4 mr-1.5" />
            {pending ? 'Updating…' : 'Mark as Dispatched'}
          </Button>
        </div>
      )}

      {canDeliver && status !== 'dispatched' && status !== 'in_transit' && (
        <p className="text-xs text-muted-foreground">
          Tip: marking the order dispatched first gives the buyer tracking updates.
        </p>
      )}

      {(status === 'dispatched' || status === 'in_transit') && (
        <Button
          disabled={pending}
          onClick={() => run(() => deliverOrderItem(itemId))}
          className="w-full sm:w-auto"
          variant="default"
        >
          <CheckCircle2 className="size-4 mr-1.5" />
          {pending ? 'Updating…' : 'Mark as Delivered'}
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
