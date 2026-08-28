import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  Wallet,
  Store,
  Plus,
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
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';
import type { SellerStatus } from '@/lib/types/database';

export const metadata = { title: 'Seller dashboard' };

const STATUS_COPY: Record<SellerStatus, { label: string; color: string; help: string }> = {
  pending: {
    label: 'Pending review',
    color: 'bg-amber-100 text-amber-800',
    help: 'Our team is reviewing your application. You can still add products.'
  },
  approved: {
    label: 'Approved',
    color: 'bg-primary/10 text-primary',
    help: 'Your store is live and ready to receive orders.'
  },
  suspended: {
    label: 'Suspended',
    color: 'bg-destructive/10 text-destructive',
    help: 'Your store has been suspended. Contact support for details.'
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-destructive/10 text-destructive',
    help: 'Your application was rejected. Please contact support.'
  }
};

export default async function SellerDashboardPage() {
  const { profile } = await requireRole('seller');
  const supabase = await createClient();

  const { data: seller } = await supabase
    .from('seller_profiles')
    .select('id, status, business_name, stores(id, name, slug, is_active)')
    .eq('user_id', profile.id)
    .maybeSingle();

  // No seller profile yet → onboarding CTA
  if (!seller) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <Store className="mx-auto size-12 text-primary" />
        <h2 className="mt-4 text-2xl font-bold">Set up your store</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You haven&apos;t completed your seller application yet.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/register/seller">Continue application</Link>
        </Button>
      </div>
    );
  }

  const store = Array.isArray(seller.stores) ? seller.stores[0] : seller.stores;
  const status = STATUS_COPY[seller.status as SellerStatus];

  // Stats
  const [{ count: productsCount }, { count: ordersCount }, { data: wallet }] =
    await Promise.all([
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store?.id ?? ''),
      supabase
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', seller.id),
      supabase
        .from('seller_wallets')
        .select('pending_balance, available_balance, settled_balance, currency')
        .eq('seller_id', seller.id)
        .maybeSingle()
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {seller.business_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {store ? (
              <>
                <Link
                  href={`/store/${store.slug}`}
                  className="hover:underline"
                >
                  /store/{store.slug}
                </Link>{' '}
                · {status.help}
              </>
            ) : (
              'Set up your store to start selling.'
            )}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}
        >
          {status.label}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={productsCount ?? 0} icon={Package} />
        <Stat label="Orders" value={ordersCount ?? 0} icon={ShoppingCart} />
        <Stat
          label="Available balance"
          value={formatNaira(wallet?.available_balance ?? 0)}
          icon={Wallet}
        />
        <Stat
          label="Pending"
          value={formatNaira(wallet?.pending_balance ?? 0)}
          icon={Wallet}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>What would you like to do?</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href="/seller/products/new">
                <Plus className="size-4" /> Add a product
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seller/orders">Process pending orders</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seller/store">Update store info</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seller/wallet">View wallet</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tips for new sellers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 text-primary" />
              Complete your store profile (logo, banner, story) to build buyer
              trust.
            </p>
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 text-primary" />
              Add harvest dates, farm location, and organic status to stand out.
            </p>
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 text-primary" />
              Respond to orders quickly to keep your acceptance rate high.
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
