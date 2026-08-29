'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  adminCancelOrder,
  adminCompleteOrder
} from '@/lib/admin/orders';

export function OrderAdminActions({
  orderId,
  status
}: {
  orderId: string;
  status: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancel = status === 'created';
  const canComplete = status === 'delivered';
  if (!canCancel && !canComplete) return null;

  async function run(action: () => Promise<{ success?: boolean; error?: string }>) {
    setPending(true);
    setError(null);
    const res = await action();
    setPending(false);
    if (res?.error) setError(res.error);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (
                window.confirm(
                  'Cancel this unpaid order? The buyer has not been charged.'
                )
              ) {
                void run(() => adminCancelOrder(orderId));
              }
            }}
          >
            <XCircle className="mr-1 size-4" /> Cancel order
          </Button>
        )}
        {canComplete && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => {
              if (window.confirm('Mark this delivered order as completed?')) {
                void run(() => adminCompleteOrder(orderId));
              }
            }}
          >
            <CheckCircle2 className="mr-1 size-4" /> Mark completed
          </Button>
        )}
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
