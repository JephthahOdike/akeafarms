import { TrendingUp, Clock, DollarSign, Package, ArrowUpRight, Wallet } from 'lucide-react';
import { getSellerProfileId } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNaira } from '@/lib/utils';
import Link from 'next/link';

export const metadata = { title: 'Store Management' };

export default async function SellerStorePage() {
  const sellerId = await getSellerProfileId();
  if (!sellerId) return null;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug, description, logo_url, is_active, is_approved')
    .eq('seller_id', sellerId)
    .single();

  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', store?.id);

  const { data: recentOrders } = store
    ? await supabase
        .from('order_items')
        .select('id, status, line_total, created_at, orders!inner(order_number, buyer_id)')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [] };

  const { data: wallet } = await supabase
    .from('seller_wallets')
    .select('pending_balance, available_balance, settled_balance')
    .eq('seller_id', sellerId)
    .single();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {store?.name || 'Your Store'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your store, products, and orders.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{productCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Balance</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNaira(wallet?.pending_balance ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNaira(wallet?.available_balance ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Settled</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNaira(wallet?.settled_balance ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Orders</CardTitle>
              <CardDescription>Latest orders for your products</CardDescription>
            </div>
            <Link href="/seller/orders" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((item) => {
                  const order = item.orders as any;
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">#{order?.order_number}</p>
                        <p className="text-xs text-muted-foreground">{formatNaira(item.line_total)}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{item.status}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {store?.logo_url ? (
                <div className="size-10 rounded-lg bg-muted overflow-hidden">
                  <div className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${store.logo_url})` }} />
                </div>
              ) : (
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary font-bold">
                  {store?.name?.charAt(0) ?? 'S'}
                </div>
              )}
              <div>
                <CardTitle className="text-lg">{store?.name || 'No store yet'}</CardTitle>
                <CardDescription>{store?.is_approved ? 'Approved' : store?.is_active ? 'Pending approval' : 'Inactive'}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Link href="/seller/products" className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-center hover:bg-accent">Manage Products</Link>
              <Link href="/seller/wallet" className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-center hover:bg-accent">View Wallet</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
