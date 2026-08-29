'use client';

import { useActionState } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { replyToTicket, type SettingsActionResult } from '@/lib/support/actions';

export function TicketReplyForm({
  ticketId,
  isStaff
}: {
  ticketId: string;
  /** Staff see the internal-note option (hidden from the ticket owner). */
  isStaff: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    SettingsActionResult | null,
    FormData
  >(
    // Server action with the ticket id bound server-action-side; the id
    // still passes through an authorization check against the session.
    replyToTicket.bind(null, ticketId),
    null
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="reply-message">Your reply</Label>
        <textarea
          id="reply-message"
          name="message"
          rows={4}
          maxLength={2000}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="Write your reply..."
        />
        {state?.fieldErrors?.message && (
          <p className="text-sm text-destructive">{state.fieldErrors.message}</p>
        )}
      </div>

      {isStaff && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="is_internal" value="true" className="size-4" />
          <Shield className="size-4" />
          Internal note (hidden from the customer)
        </label>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-600 font-medium">Reply sent.</p>
      )}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Reply'
        )}
      </Button>
    </form>
  );
}
