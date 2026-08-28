'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  approveSettlement,
  rejectSettlement,
  markSettlementPaid
} from '@/lib/admin/finance';

export function SettlementActions({
  settlementId,
  status
}: {
  settlementId: string;
  status: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  async function run(fn: () => Promise<{ error?: string }>) {
    setPending(true);
    setError(null);
    const res = await fn();
    setPending(false);
    if (res?.error) setError(res.error);
  }

  if (rejecting) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Rejection reason"
          className="h-8 w-44 rounded-md border border-border bg-background px-2 text-xs"
        />
        <button
          onClick={() => run(() => rejectSettlement(settlementId, reason))}
          disabled={pending || !reason.trim()}
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          onClick={() => setRejecting(false)}
          disabled={pending}
          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'pending' && (
        <>
          <button
            onClick={() => run(() => approveSettlement(settlementId))}
            disabled={pending}
            className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={pending}
            className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Reject
          </button>
        </>
      )}
      {status === 'approved' && (
        <button
          onClick={() => run(() => markSettlementPaid(settlementId))}
          disabled={pending}
          className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Mark paid
        </button>
      )}
      {pending && <Loader2 className="size-4 animate-spin" />}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
