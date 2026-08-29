import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Banknote, Landmark, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNaira } from '@/lib/utils';
import { SettlementActions } from '@/components/admin/settlement-actions';

export const metadata = { title: 'Settlement Details' };

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  on_hold: 'bg-orange-100 text-orange-800'
};

export default async function AdminSettlementDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('settlements.view');
  const { id } = await params;
  const supabase = await createClient();

  const { data: settlement } = await supabase
    .from('settlements')
    .select(
      'id, settlement_number, seller_id, amount, status, scheduled_for, processed_at, processed_by, paystack_transfer_code, paystack_reference, rejection_reason, notes, created_at, seller:seller_profiles(business_name, bank_name, bank_account_name, bank_account_last4, paystack_recipient_code)'
    )
    .eq('id', id)
    .maybeSingle();

  if (!settlement) notFound();

  const seller = settlement.seller as
    | {
        business_name?: string;
        bank_name?: string | null;
        bank_account_name?: string | null;
        bank_account_last4?: string | null;
        paystack_recipient_code?: string | null;
      }
    | {
        business_name?: string;
        bank_name?: string | null;
        bank_account_name?: string | null;
        bank_account_last4?: string | null;
        paystack_recipient_code?: string | null;
      }[]
    | null
    | undefined;
  const sellerInfo = Array.isArray(seller) ? seller[0] : seller;

  const { data: settlementOrders } = await supabase
    .from('settlement_orders')
    .select('amount, order:orders(order_number, total_amount, status)')
    .eq('settlement_id', settlement.id)
    .order('created_at');

  let processorEmail: string | null = null;
  if (settlement.processed_by) {
    const { data: processor } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', settlement.processed_by)
      .maybeSingle();
    processorEmail = processor?.email ?? null;
  }

  const rows = (settlementOrders ?? []).map((so) => {
    const orderRaw = so.order as
      | { order_number?: string; total_amount?: number; status?: string }
      | { order_number?: string; total_amount?: number; status?: string }[]
      | null
      | undefined;
    const order = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;
    return {
      amount: so.amount,
      order
    };
  });
  const ordersTotal = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/settlements"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to settlements
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {settlement.settlement_number || settlement.id.slice(0, 8)}
          </h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_COLORS[settlement.status] ?? 'bg-muted text-muted-foreground'
            }`}
          >
            {settlement.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {sellerInfo?.business_name || 'Unknown seller'} ·{' '}
          {formatNaira(settlement.amount)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="size-5" /> Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-medium">{formatNaira(settlement.amount)}</dd>
              <dt className="text-muted-foreground">Seller</dt>
              <dd className="font-medium">{sellerInfo?.business_name || 'Unknown'}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd>
                {new Date(settlement.created_at).toLocaleString('en-NG', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </dd>
              <dt className="text-muted-foreground">Scheduled for</dt>
              <dd>
                {settlement.scheduled_for
                  ? new Date(settlement.scheduled_for).toLocaleDateString('en-NG')
                  : '—'}
              </dd>
              <dt className="text-muted-foreground">Processed at</dt>
              <dd>
                {settlement.processed_at
                  ? new Date(settlement.processed_at).toLocaleString('en-NG', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })
                  : '—'}
              </dd>
              <dt className="text-muted-foreground">Processed by</dt>
              <dd>{processorEmail || '—'}</dd>
            </dl>
            {settlement.notes && (
              <p className="mt-4 rounded-md bg-muted p-3 text-sm">
                <span className="font-medium">Notes:</span> {settlement.notes}
              </p>
            )}
            {settlement.status === 'rejected' && settlement.rejection_reason && (
              <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <span className="font-medium">Rejection reason:</span>{' '}
                {settlement.rejection_reason}
              </p>
            )}
            <div className="mt-4">
              <SettlementActions
                settlementId={settlement.id}
                status={settlement.status}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Landmark className="size-5" /> Seller Payout Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Bank</dt>
                <dd className="font-medium">{sellerInfo?.bank_name || '—'}</dd>
                <dt className="text-muted-foreground">Account name</dt>
                <dd className="font-medium">
                  {sellerInfo?.bank_account_name || '—'}
                </dd>
                <dt className="text-muted-foreground">Account number</dt>
                <dd className="font-mono">
                  {sellerInfo?.bank_account_last4
                    ? `••••${sellerInfo.bank_account_last4}`
                    : '—'}
                </dd>
                <dt className="text-muted-foreground">Paystack recipient</dt>
                <dd className="font-mono break-all">
                  {sellerInfo?.paystack_recipient_code || 'Not created'}
                </dd>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Full account numbers are never displayed — only the database
                generated last-4 mask.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="size-5" /> Paystack Transfer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Transfer code</dt>
                <dd className="font-mono break-all">
                  {settlement.paystack_transfer_code || 'Not recorded'}
                </dd>
                <dt className="text-muted-foreground">Transfer reference</dt>
                <dd className="font-mono break-all">
                  {settlement.paystack_reference || 'Not recorded'}
                </dd>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Transfer identifiers are recorded when the payout is executed via
                Paystack. If the payout was made outside Paystack, leave these
                blank and keep the bank receipt for the audit trail.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">
            Orders in this Settlement ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No orders linked to this settlement.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4">Order</th>
                    <th className="pb-2 pr-4">Order total</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Settled amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {r.order?.order_number || 'Unknown order'}
                      </td>
                      <td className="py-2 pr-4">
                        {r.order?.total_amount != null
                          ? formatNaira(r.order.total_amount)
                          : '—'}
                      </td>
                      <td className="py-2 pr-4">{r.order?.status || '—'}</td>
                      <td className="py-2 font-medium">{formatNaira(r.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 pr-4 font-semibold">Total</td>
                    <td />
                    <td />
                    <td className="py-2 font-semibold">
                      {formatNaira(ordersTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
