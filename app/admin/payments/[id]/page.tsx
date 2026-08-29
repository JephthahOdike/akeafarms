import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CreditCard, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';
import { PaymentRefundButton } from '@/components/admin/payment-refund-button';

export const metadata = { title: 'Payment Detail' };

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800'
};

export default async function AdminPaymentDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('payments.view');
  const { id } = await params;
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .single();

  if (!payment) notFound();

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, status, buyer_id')
    .eq('id', payment.order_id)
    .single();

  const { data: buyer } = order?.buyer_id
    ? await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', order.buyer_id)
        .single()
    : { data: null };

  // Seller attribution + wallet ledger for this order. Earnings are written by
  // process_paystack_charge() (reference_type 'order', reference_id = order id);
  // platform commission is derived as item gross minus seller net. 'refund'
  // rows are the wallet reversals written by process_refund().
  const [{ data: items }, { data: earnings }, { data: refundRows }] =
    await Promise.all([
      supabase
        .from('order_items')
        .select('id, seller_id, line_total, seller:seller_profiles(business_name)')
        .eq('order_id', payment.order_id),
      supabase
        .from('wallet_transactions')
        .select('seller_id, amount')
        .eq('reference_type', 'order')
        .eq('reference_id', payment.order_id)
        .eq('type', 'seller_earning'),
      supabase
        .from('wallet_transactions')
        .select('id, seller_id, amount, description, created_at')
        .eq('reference_type', 'order')
        .eq('reference_id', payment.order_id)
        .eq('type', 'refund')
        .order('created_at', { ascending: false })
    ]);

  type SellerRow = {
    sellerId: string;
    label: string;
    gross: number;
    net: number;
    hasEarning: boolean;
  };

  const sellerMap = new Map<string, SellerRow>();
  for (const item of items ?? []) {
    const sellerId = item.seller_id as string;
    const sellerRaw = item.seller as
      | { business_name?: string }
      | { business_name?: string }[]
      | null
      | undefined;
    const label =
      (Array.isArray(sellerRaw)
        ? sellerRaw[0]?.business_name
        : sellerRaw?.business_name) ?? 'Unknown seller';
    const row = sellerMap.get(sellerId) ?? {
      sellerId,
      label,
      gross: 0,
      net: 0,
      hasEarning: false
    };
    row.gross += Number(item.line_total) || 0;
    sellerMap.set(sellerId, row);
  }
  for (const tx of earnings ?? []) {
    const row = sellerMap.get(tx.seller_id);
    if (row) {
      row.net += Number(tx.amount) || 0;
      row.hasEarning = true;
    }
  }
  const sellerRows = [...sellerMap.values()].sort((a, b) => b.gross - a.gross);
  const earningRows = sellerRows.filter((r) => r.hasEarning);
  const hasLedger = earningRows.length > 0;
  const totalGross = earningRows.reduce((sum, r) => sum + r.gross, 0);
  const totalNet = earningRows.reduce((sum, r) => sum + r.net, 0);
  const totalCommission = totalGross - totalNet;

  const badge = (status: string) =>
    `rounded-full px-2 py-0.5 text-xs font-medium ${
      STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'
    }`;

  return (
    <div>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/admin/payments">
            <ArrowLeft className="mr-1 size-4" /> Back to payments
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Payment Detail</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" /> {payment.provider_reference}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-lg font-semibold">{formatNaira(payment.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <span className={badge(payment.status)}>{payment.status}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Channel</p>
              <p className="font-medium capitalize">{payment.channel || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paystack reference</p>
              <p className="font-mono text-xs break-all">{payment.provider_reference || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Provider fee</p>
              <p className="font-medium">
                {payment.provider_fee != null
                  ? formatNaira(payment.provider_fee)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid at</p>
              <p className="font-medium">
                {payment.paid_at
                  ? new Date(payment.paid_at).toLocaleString('en-NG')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(payment.created_at).toLocaleString('en-NG')}
              </p>
            </div>
          </div>

          {order && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Order</p>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  #{order.order_number}
                </Link>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Order status</p>
                <span className={badge(order.status)}>{order.status}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Buyer</p>
                <p className="font-medium">{buyer?.email || '—'}</p>
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <PaymentRefundButton paymentId={payment.id} status={payment.status} />
          </div>

          {(payment.status === 'refunded' || (refundRows?.length ?? 0) > 0) && (
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-2">Wallet reversals</p>
              {refundRows && refundRows.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {refundRows.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {r.description || 'Refund reversal'}
                        {' · '}
                        {new Date(r.created_at).toLocaleDateString('en-NG')}
                      </span>
                      <span className="font-medium text-red-600">
                        {formatNaira(Number(r.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No wallet reversals recorded for this refund.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {hasLedger && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="size-4" /> Sellers &amp; Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Seller</th>
                    <th className="px-4 py-2 text-right font-medium">Gross</th>
                    <th className="px-4 py-2 text-right font-medium">Platform commission</th>
                    <th className="px-4 py-2 text-right font-medium">Seller earning</th>
                  </tr>
                </thead>
                <tbody>
                  {earningRows.map((r) => (
                    <tr key={r.sellerId} className="border-t border-border">
                      <td className="px-4 py-2">{r.label}</td>
                      <td className="px-4 py-2 text-right">{formatNaira(r.gross)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        −{formatNaira(r.gross - r.net)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-green-600">
                        {formatNaira(r.net)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right">{formatNaira(totalGross)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      −{formatNaira(totalCommission)}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600">{formatNaira(totalNet)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Seller earnings are credited to seller wallets once payment is confirmed.
              Platform commission is deducted per seller at the applicable rate (default 15%).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
