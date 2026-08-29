import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/helpers';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Admin Reports' };

export default async function AdminReportsPage() {
  await requirePermission('reports.view');
  const supabase = await createClient();

  const { count: totalUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  const { count: totalOrders } = await supabase.from('orders').select('id', { count: 'exact', head: true });
  const { count: totalProducts } = await supabase.from('products').select('id', { count: 'exact', head: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform performance overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-3xl font-bold">{totalUsers ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Users</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-3xl font-bold">{totalOrders ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Orders</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-3xl font-bold">{totalProducts ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Products</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Detailed reports with filters, charts, and exports will be available here. For now, view individual sections:
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><Link href="/admin/orders">Orders</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href="/admin/payments">Payments</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href="/admin/settlements">Settlements</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href="/admin/users">Users</Link></Button>
      </div>
    </div>
  );
}
