import { CheckCircle, Clock, Ban, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SellerActions } from '@/components/admin/seller-actions';

export const metadata = { title: 'Sellers' };

export default async function AdminSellersPage() {
  const supabase = await createClient();

  const { data: sellers } = await supabase
    .from('seller_profiles')
    .select(
      'id, business_name, business_type, cac_number, tin, status, suspended_reason, created_at, user_id'
    )
    .order('created_at', { ascending: false })
    .limit(100);

  const sellerIds = (sellers ?? []).map((s) => s.id);
  const userIds = (sellers ?? []).map((s) => s.user_id);

  const { data: profiles } = sellerIds.length
    ? await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
    : { data: [] };

  const { data: stores } = sellerIds.length
    ? await supabase
        .from('stores')
        .select('seller_id, name, farm_name, farm_state')
        .in('seller_id', sellerIds)
    : { data: [] };

  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email as string]));
  const storeBySellerId = new Map((stores ?? []).map((s) => [s.seller_id, s]));

  const approved = sellers?.filter((s) => s.status === 'approved').length ?? 0;
  const pending = sellers?.filter((s) => s.status === 'pending').length ?? 0;
  const suspended = sellers?.filter((s) => s.status === 'suspended').length ?? 0;
  const rejected = sellers?.filter((s) => s.status === 'rejected').length ?? 0;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-orange-100 text-orange-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return `rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-muted text-muted-foreground'}`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Sellers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage seller accounts and approvals.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <CheckCircle className="size-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold">{approved}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Clock className="size-5 text-yellow-500 mb-2" />
          <p className="text-2xl font-bold">{pending}</p>
          <p className="text-xs text-muted-foreground">Pending Review</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Ban className="size-5 text-orange-500 mb-2" />
          <p className="text-2xl font-bold">{suspended}</p>
          <p className="text-xs text-muted-foreground">Suspended</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <XCircle className="size-5 text-red-500 mb-2" />
          <p className="text-2xl font-bold">{rejected}</p>
          <p className="text-xs text-muted-foreground">Rejected</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Business</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Farm</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sellers?.map((s) => {
              const store = storeBySellerId.get(s.id);
              return (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.business_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.business_type || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {emailById.get(s.user_id) || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {store?.farm_name
                      ? `${store.farm_name} (${store.farm_state || 'N/A'})`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(s.status)}>{s.status}</span>
                    {s.status === 'suspended' && s.suspended_reason && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {s.suspended_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString('en-NG')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SellerActions sellerId={s.id} status={s.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
