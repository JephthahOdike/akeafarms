import Link from 'next/link';
import {
  ShoppingBag,
  Heart,
  Truck,
  Package,
  ArrowRight
} from 'lucide-react';
import { requireRole } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { formatNaira } from '@/lib/utils';

export const metadata = { title: 'Buyer dashboard' };

export default async function BuyerDashboardPage() {
  const { profile } = await requireRole('buyer');
  const supabase = await createClient();

  // Quick stats
  const [
    { count: ordersCount },
    { count: wishlistCount },
    { count: addressesCount }
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', profile.id),
    supabase
      .from('wishlists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id),
    supabase
      .from('shipping_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
  ]);

  const recentOrders = (
    await supabase
      .from('orders')
      .select('id, order_number, status, total_amount, currency, created_at')
      .eq('buyer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5)
  ).data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back, {profile.full_name.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your account.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total orders"
          value={ordersCount ?? 0}
          icon={ShoppingBag}
        />
        <Stat
          label="In transit"
          value={recentOrders.filter((o) =>
            ['dispatched', 'in_transit', 'packed'].includes(o.status)
          ).length}
          icon={Truck}
        />
        <Stat label="Wishlist" value={wishlistCount ?? 0} icon={Heart} />
        <Stat
          label="Saved addresses"
          value={addressesCount ?? 0}
          icon={Package}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>Your latest 5 orders</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/buyer/orders">
                View all <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <EmptyOrders />
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {o.order_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString('en-NG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatNaira(o.total_amount)}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {o.status.replaceAll('_', ' ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Start shopping</CardTitle>
            <CardDescription>Fresh produce, direct from farms.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/products">Browse products</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/categories">Shop by category</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyOrders() {
  return (
    <div className="rounded-lg border border-dashed border-border py-10 text-center">
      <ShoppingBag className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">
        You haven&apos;t placed any orders yet.
      </p>
      <Button asChild size="sm" className="mt-4">
        <Link href="/products">Browse products</Link>
      </Button>
    </div>
  );
}
