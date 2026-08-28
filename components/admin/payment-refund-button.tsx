'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { refundPayment } from '@/lib/admin/finance';

export function PaymentRefundButton({
  paymentId,
  status
}: {
  paymentId: string;
  status: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'refunded') {
    return <span className="text-sm text-muted-foreground">Refunded</span>;
  }
  if (status !== 'success') return null;

  async function handleRefund() {
    if (
      !window.confirm(
        'Refund this payment? This marks the payment and its order as refunded.'
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const res = await refundPayment(paymentId);
    setPending(false);
    if (res?.error) setError(res.error);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefund}
        disabled={pending}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        Refund
      </button>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
