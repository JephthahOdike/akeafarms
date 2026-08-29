import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/helpers';
import { getConversation } from '@/lib/messages/actions';
import { ConversationThread } from '@/components/messages/conversation-thread';

export const metadata = { title: 'Conversation' };

export default async function AdminConversationPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  // messages.view holders (admins always; employees by grant — Phase 10)
  await requirePermission('messages.view');

  const { id } = await params;

  // Staff read via hasPermission('messages.view'); opening a conversation
  // here does NOT mark messages as read (participants only) and the
  // thread renders read-only.
  const detail = await getConversation(id);
  if (!detail) notFound();

  return <ConversationThread detail={detail} backHref="/admin/messages" />;
}
