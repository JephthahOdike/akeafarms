import { requirePermission } from '@/lib/auth/helpers';
import { getStaffConversations } from '@/lib/messages/actions';
import { ConversationList } from '@/components/messages/conversation-list';

export const metadata = { title: 'Messages' };

export default async function AdminMessagesPage() {
  // messages.view holders (admins always; employees by grant — Phase 10)
  await requirePermission('messages.view');

  // Staff list via the service client — covers every conversation on the
  // platform, regardless of who the participants are.
  const conversations = await getStaffConversations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All buyer–seller conversations. Staff access is read-only — replies come only from
          the participants.
        </p>
      </div>

      <ConversationList
        items={conversations}
        basePath="/admin/messages"
        emptyHint="No buyer–seller conversations exist yet."
      />
    </div>
  );
}
