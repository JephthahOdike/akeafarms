'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupportTicket, type SettingsActionResult } from '@/lib/support/actions';

export function NewTicketForm({
  basePath,
  orders
}: {
  /** Dashboard base for the signed-in role, e.g. /buyer/support */
  basePath: string;
  /** Optional order picker (buyers only) — id/number pairs from their own account. */
  orders?: { id: string; order_number: string }[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    SettingsActionResult | null,
    FormData
  >(createSupportTicket, null);

  useEffect(() => {
    if (state?.success && state.ticketId) {
      router.push(`${basePath}/${state.ticketId}`);
    }
  }, [state, basePath, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ticket-subject">Subject</Label>
        <Input
          id="ticket-subject"
          name="subject"
          placeholder="Briefly describe the issue"
          maxLength={150}
          required
        />
        {state?.fieldErrors?.subject && (
          <p className="text-sm text-destructive">{state.fieldErrors.subject}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticket-description">Description</Label>
        <textarea
          id="ticket-description"
          name="description"
          rows={5}
          maxLength={5000}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="Tell us what happened, including any order or payment details that help us help you."
        />
        {state?.fieldErrors?.description && (
          <p className="text-sm text-destructive">{state.fieldErrors.description}</p>
        )}
      </div>

      {orders && orders.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="ticket-order">Related order (optional)</Label>
          <select
            id="ticket-order"
            name="related_order"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">None</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.related_order && (
            <p className="text-sm text-destructive">{state.fieldErrors.related_order}</p>
          )}
        </div>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Creating...
          </>
        ) : (
          'Create Ticket'
        )}
      </Button>
    </form>
  );
}
