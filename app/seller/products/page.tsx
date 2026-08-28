import Link from 'next/link';
import Image from 'next/image';
import { Plus, Package, Edit } from 'lucide-react';
import { getSellerProfileId } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { formatNaira } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'My Products' };

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1610348725531-477418e73c9a?w=400&q=80';

export default async function SellerProductsPage() {
  const sellerId = await getSellerProfileId();
  if (!sellerId) return null;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('seller_id', sellerId)
    .single();

  const { data: products } = store
    ? await supabase
        .from('products')
        .select(
          `id, name, slug, price, unit, status, is_approved, organic,
           stock_quantity, created_at,
           product_images(url, is_primary)`
        )
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products?.length ?? 0} product{(products?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/seller/products/new">
            <Plus className="mr-1 size-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {!store ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
          <Package className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Create your store first</h3>
          <p className="mt-2 text-sm text-muted-foreground">You need a store before listing products.</p>
        </div>
      ) : products && products.length > 0 ? (
        <div className="space-y-3">
          {products.map((product) => {
            const images = product.product_images as any[];
            const img = images?.find((i: any) => i.is_primary)?.url ?? images?.[0]?.url;
            return (
              <div
                key={product.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="size-16 shrink-0 rounded-lg bg-muted overflow-hidden">
                  {img ? (
                    <Image src={img} alt={product.name} width={64} height={64} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Package className="size-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{product.name}</h3>
                  <p className="text-sm text-primary font-medium">{formatNaira(product.price)} / {product.unit}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.status === 'active' && product.is_approved
                        ? 'bg-green-100 text-green-800'
                        : product.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.is_approved ? product.status : 'Pending approval'}
                    </span>
                    {product.stock_quantity != null && (
                      <span className="text-xs text-muted-foreground">
                        Stock: {product.stock_quantity}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/seller/products/${product.id}/edit`}
                  className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Edit className="size-4" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
          <Package className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">Start adding products to your store.</p>
          <Button asChild className="mt-4">
            <Link href="/seller/products/new">
              <Plus className="mr-1 size-4" />
              Add Your First Product
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
