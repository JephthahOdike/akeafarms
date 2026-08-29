import { getCurrentUser } from '@/lib/auth/helpers';
import { getMyConversations } from '@/lib/messages/actions';
import { ConversationList } from '@/components/messages/conversation-list';

export const metadata = { title: 'Messages' };

export default async function BuyerMessagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // RLS-scoped read: only conversations where the caller is the buyer
  // (or the seller of their own store, for seller accounts browsing
  // the buyer dashboard) are ever returned.
  const conversations = await getMyConversations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conversations with sellers about products and orders.
        </p>
      </div>

      <ConversationList
        items={conversations}
        basePath="/buyer/messages"
        emptyHint="Message a seller from any product page and the conversation will appear here."
        emptyCta={{ href: '/products', label: 'Browse products' }}
      />
    </div>
  );
}
