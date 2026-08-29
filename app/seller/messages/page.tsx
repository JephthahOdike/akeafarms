import { getCurrentUser } from '@/lib/auth/helpers';
import { getMyConversations } from '@/lib/messages/actions';
import { ConversationList } from '@/components/messages/conversation-list';

export const metadata = { title: 'Messages' };

export default async function SellerMessagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // RLS-scoped read: only conversations involving one of the caller's
  // seller_profiles (or where they are the buyer) are ever returned.
  const conversations = await getMyConversations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Buyer enquiries about your products and store.
        </p>
      </div>

      <ConversationList
        items={conversations}
        basePath="/seller/messages"
        emptyHint="When a buyer messages you about a product, the conversation will appear here."
      />
    </div>
  );
}
