import Link from 'next/link';
import { Package, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { formatNaira } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Orders' };

export default async function AdminOrdersPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total_amount, created_at, buyer_id')
    .order('created_at', { ascending: false })
    .limit(100);

  const completed = orders?.filter((o) => o.status === 'delivered' || o.status === 'completed').length ?? 0;
  const pending = orders?.filter((o) => o.status === 'paid' || o.status === 'processing' || o.status === 'pending').length ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor and manage all platform orders.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <Card>
          <CardContent className="pt-6">
            <Clock className="size-5 text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{pending}</p>
            <p className="text-xs text-muted-foreground">Pending / In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CheckCircle className="size-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold">{completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Buyer</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">#{o.order_number}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.buyer_id?.slice(0, 8)}...</td>
                <td className="px-4 py-3 font-medium">{formatNaira(o.total_amount)}</td>
                <td className="px-4 py-3 capitalize">{o.status?.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-NG')}</td>
                <td className="px-4 py-3">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/orders/${o.id}`}><Eye className="size-4" /></Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
