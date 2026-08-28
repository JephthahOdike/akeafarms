import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { formatNaira } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'My Wishlist' };

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1610348725531-477418e73c9a?w=400&q=80';

export default async function BuyerWishlistPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: items } = await supabase
    .from('wishlists')
    .select(
      `id,
       products!inner(
         id, name, slug, price, currency, unit, organic, status,
         product_images(url, is_primary),
         stores!inner(name, slug)
       )`
    )
    .eq('user_id', user.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Wishlist</h1>
        <p className="text-sm text-muted-foreground mt-1">Products you've saved for later.</p>
      </div>

      {items && items.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const product = item.products as any;
            const store = product.stores as any;
            const images = product.product_images as any[];
            const img = images?.find((i: any) => i.is_primary)?.url ?? images?.[0]?.url;
            return (
              <div
                key={item.id}
                className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md"
              >
                <Link href={`/products/${product.slug}`}>
                  <div className="aspect-square relative bg-muted overflow-hidden">
                    <Image
                      src={img || FALLBACK_IMG}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                </Link>
                <div className="p-3">
                  <Link href={`/store/${store.slug}`}>
                    <p className="text-xs text-muted-foreground truncate hover:text-primary">
                      {store.name || 'Unknown'}
                    </p>
                  </Link>
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="mt-1 text-sm font-semibold line-clamp-2 group-hover:text-primary">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="mt-2 text-sm font-bold text-primary">
                    {formatNaira(product.price)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">/ {product.unit}</span>
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/products/${product.slug}`}>View</Link>
                    </Button>
                    <form>
                      <Button type="submit" size="sm" variant="ghost" className="text-muted-foreground">
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
          <Heart className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Wishlist is empty</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Save your favorite products here by clicking the heart icon.
          </p>
          <Button asChild className="mt-4">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
