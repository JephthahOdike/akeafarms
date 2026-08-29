import Link from 'next/link';
import { DollarSign, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';

export const metadata = { title: 'Payments' };

const STATUSES = ['pending', 'success', 'failed', 'refunded'] as const;
const VALID_STATUSES = new Set<string>(STATUSES);

export default async function AdminPaymentsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requirePermission('payments.view');
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('payments')
    .select('id, amount, status, channel, provider_reference, created_at, order_id');

  if (q) query = query.ilike('provider_reference', `%${q}%`);
  if (status && VALID_STATUSES.has(status)) query = query.eq('status', status);

  const { data: payments } = await query
    .order('created_at', { ascending: false })
    .limit(100);

  const total = payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const successful = payments?.filter((p) => p.status === 'success').length ?? 0;
  const failed = payments?.filter((p) => p.status === 'failed').length ?? 0;
  const filtered = Boolean(q || status);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor all transactions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <DollarSign className="size-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{formatNaira(total)}</p>
            <p className="text-xs text-muted-foreground">Total volume</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CheckCircle className="size-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold">{successful}</p>
            <p className="text-xs text-muted-foreground">Successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <XCircle className="size-5 text-red-500 mb-2" />
            <p className="text-2xl font-bold">{failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      <form action="/admin/payments" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-72">
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-muted-foreground">
            Paystack reference
          </label>
          <Input id="q" name="q" defaultValue={q ?? ''} placeholder="Search reference…" />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline" size="sm" className="mb-0.5">
          <Search className="mr-1 size-4" /> Filter
        </Button>
        {filtered && (
          <Button asChild variant="ghost" size="sm" className="mb-0.5">
            <Link href="/admin/payments">Clear</Link>
          </Button>
        )}
      </form>

      <p className="mb-2 text-xs text-muted-foreground">
        Showing {payments?.length ?? 0} payment(s){filtered ? ' (filtered)' : ''} — latest 100.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Reference</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Channel</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments?.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/admin/payments/${p.id}`}
                    className="text-primary hover:underline"
                  >
                    {p.provider_reference?.slice(0, 16)}…
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">{formatNaira(p.amount)}</td>
                <td className="px-4 py-3 capitalize">{p.channel || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === 'success' ? 'bg-green-100 text-green-800' :
                    p.status === 'failed' ? 'bg-red-100 text-red-800' :
                    p.status === 'refunded' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>{p.status}</span>
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
