import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requirePermission } from '@/lib/auth/helpers';
import { getStaffTicketDetail } from '@/lib/support/actions';
import { TicketView } from '@/components/support/ticket-view';
import { TicketReplyForm } from '@/components/support/ticket-reply-form';
import { TicketStatusControls } from '@/components/support/ticket-status-controls';
import { StatusBadge, PriorityBadge } from '@/components/support/ticket-badges';

export const metadata = { title: 'Ticket' };

export default async function AdminTicketDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('support.manage');
  const { id } = await params;

  const detail = await getStaffTicketDetail(id);
  if (!detail) notFound();

  const { ticket, requester, assigned, messages, assignableStaff } = detail;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to support queue
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">{ticket.subject}</h1>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
      </div>
      <p className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Thread + reply */}
        <div className="space-y-6">
          <TicketView ticket={ticket} messages={messages} viewerIsStaff />

          <Card>
            <CardHeader>
              <CardTitle>Respond</CardTitle>
              <CardDescription>
                Public replies are visible to the customer. Internal notes are staff-only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketReplyForm ticketId={ticket.id} isStaff />
            </CardContent>
          </Card>
        </div>

        {/* Side panel: requester info, management controls, history */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Requested by</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{requester?.full_name || 'Unnamed user'}</p>
              <p className="text-muted-foreground">{requester?.email}</p>
              <p className="text-xs text-muted-foreground">
                Role: {requester?.role ?? 'unknown'}
              </p>
              {ticket.related_order && (
                <Link
                  href={`/admin/orders/${ticket.related_order}`}
                  className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                >
                  View related order <ExternalLink className="size-3" />
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage</CardTitle>
              <CardDescription>
                Assigned: {assigned ? assigned.full_name || assigned.email : 'Unassigned'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketStatusControls
                ticketId={ticket.id}
                status={ticket.status}
                priority={ticket.priority}
                assignedTo={ticket.assigned_to}
                assignableStaff={assignableStaff}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                Created {new Date(ticket.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <p>
                Last updated {new Date(ticket.updated_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <p>{messages.length} message{messages.length === 1 ? '' : 's'} on this ticket</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
