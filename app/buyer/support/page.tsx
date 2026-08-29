import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { getMyTickets } from '@/lib/support/actions';
import { StatusBadge, PriorityBadge } from '@/components/support/ticket-badges';
import { NewTicketForm } from '@/components/support/new-ticket-form';

export const metadata = { title: 'Support' };

export default async function BuyerSupportPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const list = await getMyTickets(page);

  // Recent orders for the optional "related order" picker (own orders only).
  const supabase = await createClient();
  const { data: orderRows } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  const orders = (orderRows ?? []) as { id: string; order_number: string }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Open a ticket and our team will respond. You can also reach us via the contact page.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="size-5" /> My Tickets
            </CardTitle>
            <CardDescription>
              {list.total} ticket{list.total === 1 ? '' : 's'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {list.tickets.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                You have not created any support tickets yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {list.tickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/buyer/support/${t.id}`}
                    className="flex flex-wrap items-center gap-3 py-3 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{t.ticket_number}</span>
                    <span className="flex-1 min-w-40 truncate text-sm font-medium">{t.subject}</span>
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(t.updated_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {list.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {list.page} of {list.totalPages}
                </p>
                <div className="flex gap-2">
                  {list.page > 1 && (
                    <Link
                      href={`/buyer/support?page=${list.page - 1}`}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                    >
                      Previous
                    </Link>
                  )}
                  {list.page < list.totalPages && (
                    <Link
                      href={`/buyer/support?page=${list.page + 1}`}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New Ticket</CardTitle>
            <CardDescription>We typically respond within 24 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewTicketForm basePath="/buyer/support" orders={orders} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
