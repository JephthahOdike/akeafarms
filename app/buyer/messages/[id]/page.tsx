import { notFound } from 'next/navigation';
import { getConversation } from '@/lib/messages/actions';
import { ConversationThread } from '@/components/messages/conversation-thread';

export const metadata = { title: 'Conversation' };

export default async function BuyerConversationPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // requireUser inside the action redirects anonymous visitors to login.
  // A conversation id that is malformed, missing, or owned by someone
  // else yields the same null → 404 (no existence leak).
  const detail = await getConversation(id);
  if (!detail) notFound();

  return <ConversationThread detail={detail} backHref="/buyer/messages" />;
}
