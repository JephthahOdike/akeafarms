import Link from 'next/link';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireAnyPermission } from '@/lib/auth/helpers';
import { formatNaira } from '@/lib/utils';

export const metadata = { title: 'Products' };

export default async function AdminProductsPage() {
  await requireAnyPermission(['products.view', 'products.manage']);
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, unit, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const active = products?.filter((p) => p.status === 'active').length ?? 0;
  const notActive = products?.filter((p) => p.status !== 'active').length ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and manage all marketplace products.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <CheckCircle className="size-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold">{active}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <AlertTriangle className="size-5 text-yellow-500 mb-2" />
          <p className="text-2xl font-bold">{notActive}</p>
          <p className="text-xs text-muted-foreground">Not active</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Price</th>
              <th className="px-4 py-3 text-left font-medium">Unit</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-medium truncate max-w-[200px]">{p.name}</td>
                <td className="px-4 py-3">{formatNaira(p.price)}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.unit}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {p.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString('en-NG')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
