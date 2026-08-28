import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  Store as StoreIcon,
  MapPin,
  ShieldCheck,
  Leaf,
  Star,
  Package
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('stores').select('name').eq('slug', slug).single();
  return { title: data?.name || 'Store' };
}

export default async function StorePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from('stores')
    .select(
      'id, name, slug, description, logo_url, banner_url, farm_name, farm_state, organic_certified, seller_id'
    )
    .eq('slug', slug)
    .single();

  if (!store) notFound();

  const seller = store.seller_id
    ? ((await supabase.rpc('get_public_seller_info', {
        seller_profile_id: store.seller_id
      })).data?.[0] as any)
    : null;

  // Fetch store's products
  const { data: products } = await supabase
    .from('products')
    .select(`id, name, slug, price, unit, organic,
       product_images(url, is_primary)`)
    .eq('store_id', store.id)
    .eq('status', 'active')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(20);

  const FALLBACK_BANNER = 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&q=80';
  const FALLBACK_PRODUCT = 'https://images.unsplash.com/photo-1610348725531-477418e73c9a?w=400&q=80';

  return (
    <div>
      {/* Store header */}
      <div className="relative h-48 sm:h-64 bg-muted overflow-hidden">
        <Image
          src={store.banner_url || FALLBACK_BANNER}
          alt={store.name}
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full px-4 sm:px-6 lg:px-8 pb-6 flex items-end gap-4">
          {store.logo_url && (
            <div className="size-16 sm:size-20 rounded-xl border-2 border-background bg-background overflow-hidden shrink-0 shadow">
              <Image src={store.logo_url} alt={store.name} width={80} height={80} className="size-full object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{store.name}</h1>
            {seller?.farm_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="size-3" />
                {seller.farm_name}{seller.farm_state ? `, ${seller.farm_state}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Main */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-bold">Products</h2>
                <span className="text-sm text-muted-foreground">({products?.length ?? 0})</span>
              </div>

              {products && products.length > 0 ? (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  {products.map((product) => {
                    const images = product.product_images as any[];
                    const img = images?.find((i: any) => i.is_primary)?.url ?? images?.[0]?.url;
                    return (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
                      >
                        <div className="aspect-square relative bg-muted overflow-hidden">
                          <Image
                            src={img || FALLBACK_PRODUCT}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, 33vw"
                          />
                          {product.organic && (
                            <span className="absolute top-2 left-2 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white">Organic</span>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary">{product.name}</h3>
                          <p className="mt-1 text-sm font-bold text-primary">
                            {formatNaira(product.price)}{' '}
                            <span className="text-xs font-normal text-muted-foreground">/ {product.unit}</span>
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
                  <Package className="size-10 text-muted-foreground" />
                  <h3 className="mt-3 font-semibold">No products yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">This store hasn't listed any products yet.</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="mt-8 lg:mt-0">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-semibold">About this seller</h3>
                  {store.description && (
                    <p className="mt-3 text-sm text-muted-foreground">{store.description}</p>
                  )}
                  <div className="mt-4 space-y-2 text-sm">
                    {seller?.business_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ShieldCheck className="size-4 text-primary" />
                        {seller.business_name}
                      </div>
                    )}
                    {seller?.years_of_experience > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Star className="size-4 text-primary" />
                        {seller.years_of_experience} {seller.years_of_experience === 1 ? 'year' : 'years'} of experience
                      </div>
                    )}
                    {store.organic_certified && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Leaf className="size-4 text-green-600" />
                        Organically certified
                      </div>
                    )}
                  </div>
                </div>

                <Button asChild className="w-full">
                  <Link href="/products">Browse all products</Link>
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
