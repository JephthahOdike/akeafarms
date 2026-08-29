import Link from 'next/link';
import { LifeBuoy, Mail, Phone, MessageCircle, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { requirePermission } from '@/lib/auth/helpers';
import { getStaffTicketCounts, getStaffTickets } from '@/lib/support/actions';
import { StatusBadge, PriorityBadge } from '@/components/support/ticket-badges';
import { getPlatformSettings } from '@/lib/settings/platform';

export const metadata = { title: 'Support' };

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' }
];

const PRIORITY_FILTERS: { label: string; value: string }[] = [
  { label: 'Any', value: '' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' }
];

function buildQuery(params: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `/admin/support?${s}` : '/admin/support';
}

export default async function AdminSupportPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    mine?: string;
    q?: string;
    page?: string;
  }>;
}) {
  // support.manage holders (admins always; employees by grant — Phase 10)
  await requirePermission('support.manage');

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const [counts, list, settings] = await Promise.all([
    getStaffTicketCounts(),
    getStaffTickets({
      page,
      status: sp.status,
      priority: sp.priority,
      assignedToMe: sp.mine === '1',
      search: sp.q
    }),
    getPlatformSettings()
  ]);

  const filterParams = {
    status: sp.status,
    priority: sp.priority,
    mine: sp.mine,
    q: sp.q
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customer requests from the contact page and account dashboards.
        </p>
      </div>

      {/* Queue stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{counts.open}</p>
            <p className="text-sm text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{counts.inProgress}</p>
            <p className="text-sm text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{counts.unresolved}</p>
            <p className="text-sm text-muted-foreground">Unresolved total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((f) => (
              <Link
                key={f.label}
                href={buildQuery(filterParams, { status: f.value, page: undefined })}
                className={`rounded-full px-3 py-1 text-sm ${
                  (sp.status ?? '') === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {f.label}
              </Link>
            ))}
            <span className="mx-2 h-4 w-px bg-border" />
            {PRIORITY_FILTERS.map((f) => (
              <Link
                key={f.label}
                href={buildQuery(filterParams, { priority: f.value, page: undefined })}
                className={`rounded-full px-3 py-1 text-sm ${
                  (sp.priority ?? '') === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form action="/admin/support" className="flex flex-1 min-w-64 items-center gap-2">
              {/* preserve active filters on search */}
              {sp.status && <input type="hidden" name="status" value={sp.status} />}
              {sp.priority && <input type="hidden" name="priority" value={sp.priority} />}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={sp.q ?? ''}
                  placeholder="Search subject or ticket number…"
                  className="pl-9"
                  maxLength={80}
                />
              </div>
              <Button type="submit" size="sm" variant="outline">
                Search
              </Button>
            </form>
            <Link
              href={buildQuery(filterParams, { mine: sp.mine === '1' ? undefined : '1', page: undefined })}
              className={`rounded-full px-3 py-1 text-sm ${
                sp.mine === '1'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              Assigned to me
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Ticket list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="size-5" /> Ticket Queue
          </CardTitle>
          <CardDescription>
            {list.total} ticket{list.total === 1 ? '' : 's'} matching the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.tickets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No tickets match these filters.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {list.tickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/support/${t.id}`}
                  className="flex flex-wrap items-center gap-3 py-3 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <span className="font-mono text-xs text-muted-foreground">{t.ticket_number}</span>
                  <span className="flex-1 min-w-48 truncate text-sm font-medium">{t.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.requester?.full_name || t.requester?.email || 'Unknown'}
                    {t.requester && ` · ${t.requester.email}`}
                  </span>
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                  <span className="w-40 truncate text-xs text-muted-foreground">
                    {t.assigned ? `→ ${t.assigned.full_name || t.assigned.email}` : 'Unassigned'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.updated_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
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
                    href={buildQuery(filterParams, { page: String(list.page - 1) })}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Previous
                  </Link>
                )}
                {list.page < list.totalPages && (
                  <Link
                    href={buildQuery(filterParams, { page: String(list.page + 1) })}
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

      {/* Configurable support contacts (platform settings) */}
      <Card>
        <CardHeader>
          <CardTitle>Support Contact Channels</CardTitle>
          <CardDescription>
            Shown to customers on the contact page. Editable in Platform Settings → General.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Mail className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{settings.supportEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-muted-foreground">{settings.supportPhone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MessageCircle className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-sm text-muted-foreground">{settings.supportWhatsapp}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
