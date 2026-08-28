import Link from 'next/link';
import { Clock, DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react';
import { getSellerProfileId } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNaira } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'My Wallet' };

export default async function SellerWalletPage() {
  const sellerId = await getSellerProfileId();
  if (!sellerId) return null;
  const supabase = await createClient();

  const { data: wallet } = await supabase
    .from('seller_wallets')
    .select('*')
    .eq('seller_id', sellerId)
    .single();

  const { data: transactions } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(30);

  // Settlement history for this seller only (RLS "settlements read" second layer).
  const { data: settlements } = await supabase
    .from('settlements')
    .select(
      'id, settlement_number, amount, status, scheduled_for, processed_at, rejection_reason'
    )
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(20);

  const pending = Number(wallet?.pending_balance ?? 0);
  const available = Number(wallet?.available_balance ?? 0);
  const settled = Number(wallet?.settled_balance ?? 0);

  const SETTLEMENT_BADGE: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-indigo-100 text-indigo-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-muted text-muted-foreground'
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your earnings and settlements.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{formatNaira(pending)}</p>
            <p className="text-xs text-muted-foreground">Awaiting settlement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatNaira(available)}</p>
            <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Settled</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNaira(settled)}</p>
            <p className="text-xs text-muted-foreground">Lifetime earnings paid out</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Settlement History</CardTitle>
          <CardDescription>Payouts of your available balance to your bank account</CardDescription>
        </CardHeader>
        <CardContent>
          {settlements && settlements.length > 0 ? (
            <div className="space-y-3">
              {settlements.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 text-sm border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium font-mono">{s.settlement_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.processed_at
                        ? `Paid ${new Date(s.processed_at).toLocaleDateString('en-NG')}`
                        : s.scheduled_for
                          ? `Scheduled ${new Date(s.scheduled_for).toLocaleDateString('en-NG')}`
                          : 'Awaiting schedule'}
                      {s.rejection_reason ? ` · ${s.rejection_reason}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                        SETTLEMENT_BADGE[s.status as string] ?? 'bg-muted'
                      }`}
                    >
                      {s.status}
                    </span>
                    <p className="font-semibold">{formatNaira(s.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No settlements yet. Your available balance will be paid out on the next settlement run.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <CardDescription>Recent wallet transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium capitalize">{tx.type?.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.description || tx.reference_type}
                      {tx.reference_id ? ` · #${tx.reference_id.slice(0, 8)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${Number(tx.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(tx.amount) > 0 ? '+' : ''}{formatNaira(Math.abs(Number(tx.amount)))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString('en-NG')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
