import {
  Users,
  ShieldCheck,
  ShoppingCart,
  Wallet,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { requireRole } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { formatNaira } from '@/lib/utils';

export const metadata = { title: 'Admin overview' };

export default async function AdminDashboardPage() {
  await requireRole('admin');
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
