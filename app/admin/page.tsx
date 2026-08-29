import {
  Users,
  ShieldCheck,
  ShoppingCart,
  Wallet,
  TrendingUp,
  AlertCircle,
  KeyRound,
  LayoutGrid,
  Activity,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { requireRole, getEmployeePermissions } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { formatNaira } from '@/lib/utils';
import { EMPLOYEE_PERMISSIONS, MODULE_PERMISSIONS } from '@/lib/auth/permissions';

export const metadata = { title: 'Admin overview' };

export default async function AdminDashboardPage() {
  const user = await requireRole(['admin', 'employee']);

  if (user.profile.role === 'employee') {
    return <EmployeeHome userId={user.id} />;
  }

  const supabase = await createClient();

  const [
    { count: usersCount },
    { count: sellersCount },
    { count: pendingSellersCount },
    { count: ordersCount },
    { data: paidOrders },
    { data: pendingSettlements }
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('seller_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved'),
    supabase
      .from('seller_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select('total_amount, currency')
      .eq('status', 'paid')
      .limit(500),
    supabase
      .from('settlements')
      .select('id, amount, currency, seller_id')
      .eq('status', 'pending')
      .limit(10)
  ]);

  const gmv =
    paidOrders?.reduce(
      (acc, o) => acc + Number(o.total_amount ?? 0),
      0
    ) ?? 0;

  const pendingSettlementAmount =
    pendingSettlements?.reduce((a, s) => a + Number(s.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Marketplace overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Live state of the Akea Farms platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total users" value={usersCount ?? 0} icon={Users} />
        <Stat
          label="Active sellers"
          value={`${sellersCount ?? 0}`}
          sub={`${pendingSellersCount ?? 0} pending`}
          icon={ShieldCheck}
        />
        <Stat label="Orders" value={ordersCount ?? 0} icon={ShoppingCart} />
        <Stat
          label="GMV (paid)"
          value={formatNaira(gmv)}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Operations queue</CardTitle>
            <CardDescription>
              Things that need admin attention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              <QueueItem
                label="Seller applications awaiting review"
                value={pendingSellersCount ?? 0}
                href="/admin/sellers?status=pending"
              />
              <QueueItem
                label="Settlements awaiting approval"
                value={pendingSettlements?.length ?? 0}
                sub={formatNaira(pendingSettlementAmount)}
                href="/admin/settlements?status=pending"
              />
              <QueueItem
                label="Open support tickets"
                value={0}
                href="/admin/support?status=open"
              />
              <QueueItem
                label="Open disputes"
                value={0}
                href="/admin/disputes"
              />
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <Wallet className="mt-0.5 size-4 text-primary" />
              Platform commission is configurable per seller and category in{' '}
              <code className="text-foreground">/admin/commissions</code>.
            </p>
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 text-primary" />
              Paystack webhook secret must be set in env to receive payment
              events.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Employee landing page (Phase 10)                                   */
/* ------------------------------------------------------------------ */

async function EmployeeHome({ userId }: { userId: string }) {
  const permKeys = await getEmployeePermissions();
  const held = new Set(permKeys);
  const labelByKey = new Map<string, string>(
    EMPLOYEE_PERMISSIONS.map((p) => [p.key, p.label])
  );

  const supabase = await createClient();
  const service = createServiceClient();

  // Relevant metrics — computed ONLY for modules the employee can access.
  // Reads go through the user client so RLS is the second enforcement layer.
  const [
    { count: ordersCount },
    { count: pendingOrdersCount },
    { count: paymentsCount },
    { count: productsCount },
    { count: pendingSellersCount },
    { count: pendingSettlementsCount },
    { count: trackingCount }
  ] = await Promise.all([
    held.has('orders.view')
      ? supabase.from('orders').select('id', { count: 'exact', head: true })
      : Promise.resolve({ count: null }),
    held.has('orders.view')
      ? supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['created', 'paid'])
      : Promise.resolve({ count: null }),
    held.has('payments.view')
      ? supabase.from('payments').select('id', { count: 'exact', head: true })
      : Promise.resolve({ count: null }),
    held.has('products.view')
      ? supabase.from('products').select('id', { count: 'exact', head: true })
      : Promise.resolve({ count: null }),
    held.has('sellers.view') || held.has('sellers.manage')
      ? supabase
          .from('seller_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      : Promise.resolve({ count: null }),
    held.has('settlements.view')
      ? supabase
          .from('settlements')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      : Promise.resolve({ count: null }),
    held.has('tracking.manage')
      ? supabase
          .from('tracking_events')
          .select('id', { count: 'exact', head: true })
      : Promise.resolve({ count: null })
  ]);

  // Recent activity — the employee's OWN audit entries, read through the
  // service client filtered to their user id (audit_logs RLS is admin-only).
  const { data: activity } = await service
    .from('audit_logs')
    .select('action, resource, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8);

  const availableModules = Object.entries(MODULE_PERMISSIONS)
    .filter(([, perms]) => perms.some((p) => held.has(p)))
    .map(([href, perms]) => ({
      href,
      label: href.replace('/admin/', '').replace(/^\w/, (c) => c.toUpperCase()),
      permission: perms.find((p) => held.has(p))!
    }));

  const metrics = [
    ordersCount !== null
      ? { label: 'Total orders', value: ordersCount ?? 0 }
      : null,
    pendingOrdersCount !== null
      ? { label: 'Orders to fulfil', value: pendingOrdersCount ?? 0 }
      : null,
    paymentsCount !== null
      ? { label: 'Payments recorded', value: paymentsCount ?? 0 }
      : null,
    productsCount !== null
      ? { label: 'Products', value: productsCount ?? 0 }
      : null,
    pendingSellersCount !== null
      ? { label: 'Sellers awaiting review', value: pendingSellersCount ?? 0 }
      : null,
    pendingSettlementsCount !== null
      ? { label: 'Settlements pending', value: pendingSettlementsCount ?? 0 }
      : null,
    trackingCount !== null
      ? { label: 'Tracking events', value: trackingCount ?? 0 }
      : null
  ].filter((m): m is { label: string; value: number } => m !== null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Employee dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Your assigned permissions and the modules you can work in.
        </p>
      </div>

      {metrics.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="mt-1 text-2xl font-bold">{m.value}</p>
                </div>
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="size-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-primary" />
              Assigned permissions
            </CardTitle>
            <CardDescription>
              Granted by an administrator. Contact an admin to request more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No permissions assigned yet.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {permKeys.map((k) => (
                  <li
                    key={k}
                    className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium"
                  >
                    {labelByKey.get(k) ?? k}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="size-4 text-primary" />
              Available modules
            </CardTitle>
            <CardDescription>
              Sections unlocked by your permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No modules available yet.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {availableModules.map((m) => (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/50"
                    >
                      <span className="font-medium">{m.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.permission}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-primary" />
            Recent activity
          </CardTitle>
          <CardDescription>Your latest recorded actions.</CardDescription>
        </CardHeader>
        <CardContent>
          {!activity || activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span className="font-medium">
                    {String(a.action).replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(String(a.created_at)).toLocaleString('en-NG')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon: Icon
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function QueueItem({
  label,
  value,
  sub,
  href
}: {
  label: string;
  value: number;
  sub?: string;
  href: string;
}) {
  return (
    <li className="flex items-center justify-between py-3">
      <span className="text-foreground">{label}</span>
      <a
        href={href}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        {value}
        {sub && <span className="text-muted-foreground">({sub})</span>}
      </a>
    </li>
  );
}
