import { Shield } from 'lucide-react';
import { StatusBadge, PriorityBadge } from './ticket-badges';
import type { TicketMessageView } from '@/lib/support/actions';
import type { SupportTicket } from '@/lib/types/database';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

/**
 * Shared ticket thread: original description + conversation history.
 * Message content is rendered as plain text — React escapes it, so no
 * markup/injection can execute (Phase 11 sanitization model).
 */
export function TicketView({
  ticket,
  messages,
  viewerIsStaff
}: {
  ticket: SupportTicket;
  messages: TicketMessageView[];
  viewerIsStaff: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Original request */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className="text-xs text-muted-foreground">
            Created {formatDateTime(ticket.created_at)} · Updated{' '}
            {formatDateTime(ticket.updated_at)}
          </span>
        </div>
        <h2 className="mt-3 font-semibold">{ticket.subject}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {ticket.description}
        </p>
      </div>

      {/* Conversation history (oldest first). Internal notes only ever
          reach staff viewers (RLS + action filters). */}
      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((m) => {
            const isStaffSender = m.sender?.role === 'admin' || m.sender?.role === 'employee';
            return (
              <div
                key={m.id}
                className={`rounded-lg border p-4 ${
                  m.is_internal
                    ? 'border-dashed border-amber-300 bg-amber-50'
                    : isStaffSender
                      ? 'border-border bg-muted/40'
                      : 'border-border bg-card'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {m.sender?.full_name || m.sender?.email || 'User'}
                  </span>
                  {isStaffSender && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      Support Team
                    </span>
                  )}
                  {m.is_internal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-amber-900">
                      <Shield className="size-3" /> Internal note
                    </span>
                  )}
                  <span>{formatDateTime(m.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {viewerIsStaff && ticket.related_order && (
        <p className="text-xs text-muted-foreground">
          Related order: <span className="font-mono">{ticket.related_order}</span>
        </p>
      )}
    </div>
  );
}
