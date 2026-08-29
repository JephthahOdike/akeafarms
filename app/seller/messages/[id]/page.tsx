import { notFound } from 'next/navigation';
import { getConversation } from '@/lib/messages/actions';
import { ConversationThread } from '@/components/messages/conversation-thread';

export const metadata = { title: 'Conversation' };

export default async function SellerConversationPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // requireUser inside the action redirects anonymous visitors to login.
  // Only conversations involving one of the caller's stores (or their own
  // buyer-side ones) resolve; everything else renders a 404.
  const detail = await getConversation(id);
  if (!detail) notFound();

  return <ConversationThread detail={detail} backHref="/seller/messages" />;
}
