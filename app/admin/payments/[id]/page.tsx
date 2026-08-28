import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
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
        </CardContent>
      </Card>
    </div>
  );
}
