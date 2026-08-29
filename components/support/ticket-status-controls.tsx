'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  assignTicket,
  updateTicketPriority,
  updateTicketStatus,
  type SettingsActionResult,
  type TicketPriority,
  type TicketStatus
} from '@/lib/support/actions';

const STATUS_FLOW: { label: string; value: TicketStatus }[] = [
  { label: 'Start working', value: 'in_progress' },
  { label: 'Mark resolved', value: 'resolved' },
  { label: 'Close ticket', value: 'closed' },
  { label: 'Reopen', value: 'open' }
];

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

/**
 * Staff-only ticket controls (status / priority / assignment). Every
 * mutation is a server action that re-checks support.manage; the RLS
 * UPDATE policy enforces the same rule at the database.
 */
export function TicketStatusControls({
  ticketId,
  status,
  priority,
  assignedTo,
  assignableStaff
}: {
  ticketId: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string | null;
  assignableStaff: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<SettingsActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  const availableStatuses = STATUS_FLOW.filter((s) => s.value !== status);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2">
          {availableStatuses.map((s) => (
            <Button
              key={s.value}
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => updateTicketStatus(ticketId, s.value))}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticket-priority">Priority</Label>
        <select
          id="ticket-priority"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={priority}
          disabled={pending}
          onChange={(e) => run(() => updateTicketPriority(ticketId, e.target.value))}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticket-assignee">Assigned to</Label>
        <select
          id="ticket-assignee"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={assignedTo ?? ''}
          disabled={pending}
          onChange={(e) => run(() => assignTicket(ticketId, e.target.value || null))}
        >
          <option value="">Unassigned</option>
          {assignableStaff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {pending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Saving…
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
