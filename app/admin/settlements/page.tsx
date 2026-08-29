import Link from 'next/link';
import { Percent, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNaira } from '@/lib/utils';
import { CommissionEditor } from '@/components/admin/commission-editor';
import { SettlementActions } from '@/components/admin/settlement-actions';

export const metadata = { title: 'Commissions & Settlements' };

const SETTLEMENT_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  on_hold: 'bg-orange-100 text-orange-800'
};

export default async function AdminCommissionsPage() {
  const supabase = await createClient();

  const { data: rates } = await supabase
    .from('commission_rates')
    .select('id, seller_id, category_id, percentage')
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: sellers } = await supabase
    .from('seller_profiles')
    .select('id, business_name')
    .order('business_name')
    .limit(500);

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')
    .limit(500);

  const { data: settlements } = await supabase
    .from('settlements')
    .select(
      'id, settlement_number, seller_id, amount, status, rejection_reason, paystack_transfer_code, paystack_reference, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(50);

  const sellerNameById = new Map(
    (sellers ?? []).map((s) => [s.id, s.business_name as string])
  );
  const categoryNameById = new Map(
    (categories ?? []).map((c) => [c.id, c.name as string])
  );

  const globalRate = (rates ?? []).find(
    (r) => !r.seller_id && !r.category_id
  );
  const overrides = (rates ?? [])
    .filter((r) => r.seller_id || r.category_id)
    .map((r) => ({
      id: r.id,
      percentage: r.percentage,
      label: r.seller_id
        ? sellerNameById.get(r.seller_id) || 'Seller'
        : categoryNameById.get(r.category_id!) || 'Category'
    }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Commissions & Settlements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage platform commissions and seller payouts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="size-5" /> Commission Rates
            </CardTitle>
            <CardDescription>
              Default rate plus seller and category overrides
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionEditor
              defaultRate={globalRate?.percentage ?? null}
              sellers={(sellers ?? []).map((s) => ({
                id: s.id,
                name: s.business_name
              }))}
              categories={(categories ?? []).map((c) => ({
                id: c.id,
                name: c.name
              }))}
              overrides={overrides}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="size-5" /> Seller Settlements
            </CardTitle>
            <CardDescription>Approve and process payout requests</CardDescription>
          </CardHeader>
          <CardContent>
            {settlements && settlements.length > 0 ? (
              <div className="space-y-3">
                {settlements.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{formatNaira(s.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {sellerNameById.get(s.seller_id) || 'Unknown seller'} ·{' '}
                          <Link
                            href={`/admin/settlements/${s.id}`}
                            className="underline underline-offset-2 hover:text-foreground"
                          >
                            {s.settlement_number || s.id.slice(0, 8)}
                          </Link>
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          SETTLEMENT_COLORS[s.status] ??
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    {(s.paystack_transfer_code || s.paystack_reference) && (
                      <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
                        {s.paystack_transfer_code || ''}
                        {s.paystack_transfer_code && s.paystack_reference
                          ? ' · '
                          : ''}
                        {s.paystack_reference || ''}
                      </p>
                    )}
                    {s.status === 'rejected' && s.rejection_reason && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.rejection_reason}
                      </p>
                    )}
                    <div className="mt-2">
                      <SettlementActions
                        settlementId={s.id}
                        status={s.status}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No settlements yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
