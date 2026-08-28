'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  approveSeller,
  rejectSeller,
  suspendSeller,
  unsuspendSeller
} from '@/lib/admin/sellers';

type Props = { sellerId: string; status: string };

export function SellerActions({ sellerId, status }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState('');

  async function run(fn: () => Promise<{ error?: string }>) {
    setPending(true);
    setError(null);
    try {
      const res = await fn();
      if (res?.error) setError(res.error);
    } catch {
      setError('Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  if (suspending) {
    return (
      <div className="flex items-center justify-end gap-2">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Suspension reason"
          className="h-8 w-44 rounded-md border border-border bg-background px-2 text-xs"
        />
        <button
          onClick={() => run(() => suspendSeller(sellerId, reason))}
          disabled={pending || !reason.trim()}
          className="rounded-md bg-orange-600 px-2 py-1 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          onClick={() => setSuspending(false)}
          disabled={pending}
          className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {(status === 'pending' || status === 'rejected') && (
        <button
          onClick={() => run(() => approveSeller(sellerId))}
          disabled={pending}
          className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {status === 'pending' && (
        <button
          onClick={() => {
            if (window.confirm('Reject this seller application?')) {
              run(() => rejectSeller(sellerId));
            }
          }}
          disabled={pending}
          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Reject
        </button>
      )}
      {status === 'approved' && (
        <button
          onClick={() => setSuspending(true)}
          disabled={pending}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          Suspend
        </button>
      )}
      {status === 'suspended' && (
        <button
          onClick={() => run(() => unsuspendSeller(sellerId))}
          disabled={pending}
          className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Unsuspend
        </button>
      )}
      {pending && <Loader2 className="size-4 animate-spin" />}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
