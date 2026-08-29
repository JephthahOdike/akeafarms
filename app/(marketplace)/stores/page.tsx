import Link from 'next/link';
import { Store } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'All Stores',
  description:
    'Discover verified Nigerian farms and agro-businesses selling fresh produce directly on Akea Farms.',
  path: '/stores'
});

export default async function StoresPage() {
  const supabase = await createClient();

  const { data: stores } = await supabase
    .from('stores')
    .select(
      'id, name, slug, description, logo_url, banner_url, farm_name, farm_state, organic_certified, seller_id'
    )
    .eq('is_active', true)
    .order('name');

  const sellerIds = (stores ?? [])
    .map((s) => s.seller_id)
    .filter((id): id is string => Boolean(id));

  const { data: sellerRows } = sellerIds.length
    ? await supabase.rpc('get_public_seller_infos', {
        seller_profile_ids: sellerIds
      })
    : { data: [] };

  const sellersById = new Map(
    ((sellerRows ?? []) as { id: string; business_name: string | null }[]).map(
      (s) => [s.id, s]
    )
  );

  const FALLBACK_BANNER = 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&q=80';

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Our Stores</h1>
          <p className="mt-2 text-muted-foreground">
            Discover stores from verified farmers, distributors, and agro-businesses across Nigeria.
          </p>
        </div>

        {stores && stores.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => {
              const seller = sellersById.get(store.seller_id) as
                | { business_name: string | null }
                | undefined;
              return (
                <Link
                  key={store.id}
                  href={`/store/${store.slug}`}
                  className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="h-36 relative bg-muted overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-105"
                      style={{ backgroundImage: `url(${store.banner_url || FALLBACK_BANNER})` }}
                    />
                    {store.logo_url && (
                      <div className="absolute bottom-3 left-4 size-14 rounded-lg border-2 border-background bg-background overflow-hidden shadow">
                        <div
                          className="size-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${store.logo_url})` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold group-hover:text-primary">{store.name}</h3>
                    {seller?.business_name && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {seller.business_name}
                        {store.farm_name && ` · ${store.farm_name}`}
                        {store.farm_state && ` · ${store.farm_state}`}
                      </p>
                    )}
                    {store.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{store.description}</p>
                    )}
                    {store.organic_certified && (
                      <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                        Organic certified
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Store className="size-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No stores yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Stores will appear here once sellers join the platform.</p>
          </div>
        )}
      </div>
    </div>
  );
}
