'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  startConversationWithSeller,
  type MessageActionResult
} from '@/lib/messages/actions';
import { MAX_MESSAGE_LENGTH } from '@/lib/messages/constants';

/**
 * First-contact form from a product page. Only the product id is passed
 * from the client — the seller side is resolved server-side via the
 * product → store → seller_profiles chain.
 */
export function StartConversationForm({
  productId,
  productName
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    MessageActionResult | null,
    FormData
  >(startConversationWithSeller, null);

  useEffect(() => {
    if (state?.success && state.conversationId) {
      router.push(`/buyer/messages/${state.conversationId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="product_id" value={productId} />
      <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
        Asking about <span className="font-medium">{productName}</span>
      </p>
      <textarea
        name="body"
        rows={4}
        maxLength={MAX_MESSAGE_LENGTH}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        placeholder="Hi, I'd like to ask about this product..."
      />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <SendHorizonal className="mr-2 size-4" />
            Start Conversation
          </>
        )}
      </Button>
    </form>
  );
}
