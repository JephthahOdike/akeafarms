import Link from 'next/link';
import { Package, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConversationDetail } from '@/lib/messages/actions';
import { MessageReplyForm } from './message-reply-form';

type Detail = NonNullable<ConversationDetail>;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

/**
 * Shared conversation thread for buyer, seller, and staff views.
 * Bodies are rendered as plain text — React escapes them, so no
 * injection/XSS can execute (same sanitization model as support tickets).
 */
export function ConversationThread({ detail, backHref }: { detail: Detail; backHref: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to messages
      </Link>

      {/* Context header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {detail.buyer_name} <span className="text-muted-foreground">↔</span> {detail.seller_name}
          </CardTitle>
          <CardDescription>
            Started {formatDateTime(detail.created_at)}
            {detail.product_name && (
              <>
                {' · About '}
                {detail.product_slug ? (
                  <Link
                    href={`/products/${detail.product_slug}`}
                    className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
                  >
                    <Package className="size-3.5" /> {detail.product_name}
                  </Link>
                ) : (
                  detail.product_name
                )}
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Staff view banner */}
      {detail.staffView && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert className="size-4 shrink-0" />
          Staff view — you are not a participant in this conversation. It is read-only and
          opening it does not mark messages as read.
        </div>
      )}

      {/* Message history (oldest first) */}
      <div className="space-y-3">
        {detail.messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet.
          </p>
        ) : (
          detail.messages.map((m) => (
            <div key={m.id} className={`flex ${m.from_me ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl border px-4 py-3 ${
                  m.from_me
                    ? 'border-primary/20 bg-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{m.sender_name}</span>
                  <span>{formatDateTime(m.created_at)}</span>
                  {m.from_me && (
                    <span className={m.read_at ? 'text-green-600' : ''}>
                      {m.read_at ? 'Read' : 'Delivered'}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">{m.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply (participants only — staff view stays read-only) */}
      {detail.participant ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reply</CardTitle>
          </CardHeader>
          <CardContent>
            <MessageReplyForm conversationId={detail.id} />
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Replies are only available to the buyer and the seller.
        </p>
      )}
    </div>
  );
}
