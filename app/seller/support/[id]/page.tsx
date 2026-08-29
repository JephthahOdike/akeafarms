import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/helpers';
import { getMyTicketDetail } from '@/lib/support/actions';
import { TicketView } from '@/components/support/ticket-view';
import { TicketReplyForm } from '@/components/support/ticket-reply-form';

export const metadata = { title: 'Ticket' };

export default async function SellerTicketDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const detail = await getMyTicketDetail(id);
  // Foreign ticket IDs are rejected server-side (ownership re-checked in
  // the action) and render a 404 rather than leaking existence.
  if (!detail) notFound();

  const { ticket, messages } = detail;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/seller/support"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to my tickets
      </Link>

      <TicketView ticket={ticket} messages={messages} viewerIsStaff={false} />

      <Card>
        <CardHeader>
          <CardTitle>Add a reply</CardTitle>
          <CardDescription>
            Our support team will be notified. Replying to a resolved ticket reopens it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketReplyForm ticketId={ticket.id} isStaff={false} />
        </CardContent>
      </Card>
    </div>
  );
}
