import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StartConversationForm } from '@/components/messages/start-conversation-form';

export const metadata = { title: 'New Message' };

export default async function NewBuyerConversationPage({
  searchParams
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const productId = sp.product ?? '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    notFound();
  }

  // Public catalog read (RLS-scoped user client) — used only to display
  // context. The seller side is resolved server-side in the action.
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('id, name, slug, stores(name)')
    .eq('id', productId)
    .eq('status', 'active')
    .maybeSingle();
  if (!product) notFound();

  const p = product as { id: string; name: string; slug: string; stores: unknown };
  // PostgREST may embed a to-one relation as an object or an array —
  // handle both when reading the store name for display only.
  const storeRaw = p.stores;
  const storeName = Array.isArray(storeRaw)
    ? ((storeRaw[0] as { name?: string } | undefined)?.name ?? null)
    : ((storeRaw as { name?: string } | null)?.name ?? null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Message the seller</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask about availability, packaging, or delivery before you buy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{p.name}</CardTitle>
          <CardDescription>
            {storeName ? `Sold by ${storeName}` : 'Product enquiry'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StartConversationForm productId={p.id} productName={p.name} />
        </CardContent>
      </Card>
    </div>
  );
}
