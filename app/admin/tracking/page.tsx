import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/helpers';
import Link from 'next/link';

export const metadata = { title: 'Tracking' };

export default async function AdminTrackingPage() {
  await requirePermission('tracking.manage');
  const supabase = await createClient();

  const { data: events } = await supabase
    .from('tracking_events')
    .select('id, status, location, notes, created_at, order_id')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Order Tracking</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor order tracking events across all orders.</p>
      </div>

      {events && events.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">#{e.order_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 capitalize">{e.status?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.location || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{e.notes || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(e.created_at).toLocaleDateString('en-NG')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">No tracking events recorded yet.</p>
      )}
    </div>
  );
}
