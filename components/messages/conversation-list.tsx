import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import type { ConversationListItem } from '@/lib/messages/actions';

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

/**
 * Shared conversation list for buyer, seller, and staff views.
 * Message bodies are rendered as plain text — React escapes content,
 * so no injection/XSS can execute.
 */
export function ConversationList({
  items,
  basePath,
  emptyHint,
  emptyCta
}: {
  items: ConversationListItem[];
  basePath: string;
  emptyHint: string;
  emptyCta?: { href: string; label: string };
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
        <MessageSquare className="size-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No conversations yet</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{emptyHint}</p>
        {emptyCta && (
          <Link
            href={emptyCta.href}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            {emptyCta.label}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((c) => {
        const preview = c.last_message
          ? `${c.last_message.from_me ? 'You: ' : ''}${c.last_message.body}`
          : null;
        return (
          <Link
            key={c.id}
            href={`${basePath}/${c.id}`}
            className="flex items-start gap-4 px-4 py-4 hover:bg-muted/40 transition-colors"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {c.counterpart_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-medium">{c.counterpart_name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatWhen(c.last_message_at)}
                </span>
              </div>
              {c.product_name && (
                <span className="mt-0.5 inline-block max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {c.product_name}
                </span>
              )}
              <p
                className={`mt-1 truncate text-sm ${
                  c.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {preview ?? 'No messages yet — say hello.'}
              </p>
            </div>
            {c.unread_count > 0 && (
              <span className="mt-1 shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {c.unread_count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
