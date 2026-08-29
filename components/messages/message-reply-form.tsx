'use client';

import { useActionState } from 'react';
import { Loader2, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  sendMessageToConversation,
  type MessageActionResult
} from '@/lib/messages/actions';
import { MAX_MESSAGE_LENGTH } from '@/lib/messages/constants';

/**
 * Reply box for an existing conversation. The conversation id is bound
 * into the server action; participation is re-verified server-side on
 * every submit (the RLS INSERT policy backs this up at the DB layer).
 */
export function MessageReplyForm({ conversationId }: { conversationId: string }) {
  const [state, formAction, pending] = useActionState<
    MessageActionResult | null,
    FormData
  >(sendMessageToConversation.bind(null, conversationId), null);

  return (
    <form action={formAction} className="space-y-3">
      <textarea
        name="body"
        rows={3}
        maxLength={MAX_MESSAGE_LENGTH}
        required
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        placeholder="Write your message..."
      />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && (
        <p className="text-sm font-medium text-green-600">Message sent.</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Max {MAX_MESSAGE_LENGTH.toLocaleString()} characters.
        </p>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <SendHorizonal className="mr-2 size-4" />
              Send
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
