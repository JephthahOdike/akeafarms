import Link from 'next/link';
import Image from 'next/image';
import { Leaf, Search, SlidersHorizontal, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNaira, cn } from '@/lib/utils';

import type { Metadata } from 'next';
import MobileFilters from './_mobile-filters';
import { SITE_NAME } from '@/lib/utils';
import { itemListJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';

type SearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
}>;

export async function generateMetadata({
  searchParams
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q, category } = await searchParams;
  const trimmedQ = q?.trim();

  // Search-result URLs are filtered views of the marketplace: keep them out
  // of the index but allow crawling so linked products are still discovered.
  if (trimmedQ) {
    return {
      title: `Search results for "${trimmedQ}"`,
      robots: { index: false, follow: true },
      alternates: { canonical: '/products' }
    };
  }

  const categoryLabel =
    category && category !== 'all'
      ? category
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : undefined;

  const title = categoryLabel ? `${categoryLabel} Products` : 'All Products';
  const description = categoryLabel
    ? `Browse ${categoryLabel.toLowerCase()} from verified Nigerian farmers and agro-businesses on ${SITE_NAME}.`
    : 'Browse fresh farm produce, grains, vegetables, livestock and more from verified Nigerian farmers on Akea Farms.';

  return {
    title,
    description,
    alternates: { canonical: '/products' },
    openGraph: {
      title,
      description,
      url: '/products',
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_NG'
    },
    twitter: { card: 'summary_large_image', title, description }
  };
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { q, category, sort } = await searchParams;
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from('products')
    .select(
      `id, name, slug, price, currency, unit, organic, quality_grade,
       product_images(url, is_primary),
       stores!inner(name, slug)`
    )
    .eq('status', 'active');

  if (q) {
    query = query.textSearch('tsv', q, { type: 'websearch' });
  }

  // Category filter
  if (category && category !== 'all') {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single();
    if (cat) {
      query = query.eq('category_id', cat.id);
    }
  }

  // Sorting
  switch (sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const { data: products } = await query.limit(48);

  // Fetch categories for sidebar
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .is('parent_id', null)
    .eq('is_active', true)
    .order('sort_order');

  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1610348725531-477418e73c9a?w=400&q=80';

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Structured data: ItemList of marketplace products */}
      {products && products.length > 0 && (
        <JsonLd
          data={itemListJsonLd(
            'All Products',
            products.map((p) => ({ name: p.name, path: `/products/${p.slug}` }))
          )}
        />
      )}

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">All Products</h1>
          <p className="mt-2 text-muted-foreground">
            Browse fresh agricultural products from verified Nigerian farmers and distributors.
          </p>
        </div>

        {/* Search bar */}
        <form action="/products" className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q || ''}
              placeholder="Search products..."
              className="pl-9 pr-10"
            />
            {q && (
              <a href="/products" className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="size-4 text-muted-foreground hover:text-foreground" />
              </a>
            )}
          </div>
          {category && category !== 'all' && (
            <input type="hidden" name="category" value={category} />
          )}
          {sort && <input type="hidden" name="sort" value={sort} />}
        </form>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Category filter sidebar - desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Categories</span>
              </div>
              <div className="space-y-1">
                <a
                  href="/products"
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm transition-colors',
                    !category || category === 'all'
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  All Products
                </a>
                {categories?.map((c) => (
                  <a
                    key={c.id}
                    href={`/products?category=${c.slug}${sort ? `&sort=${sort}` : ''}`}
                    className={cn(
                      'block rounded-md px-3 py-2 text-sm transition-colors',
                      category === c.slug
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    {c.name}
                  </a>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <span className="text-sm font-semibold">Sort by</span>
                <div className="mt-2 space-y-1">
                  {[
                    { value: '', label: 'Newest' },
                    { value: 'price_asc', label: 'Price: Low → High' },
                    { value: 'price_desc', label: 'Price: High → Low' }
                  ].map((s) => (
                    <a
                      key={s.value}
                      href={`/products${q ? `?q=${encodeURIComponent(q)}` : ''}${category && category !== 'all' ? `${q ? '&' : '?'}category=${category}` : ''}${s.value ? `${(q || (category && category !== 'all')) ? '&' : '?'}sort=${s.value}` : ''}`}
                      className={cn(
                        'block rounded-md px-3 py-2 text-sm transition-colors',
                        (sort === s.value || (!sort && s.value === ''))
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Products grid */}
          <div className="lg:col-span-3">
            {/* Mobile filter row */}
            <MobileFilters q={q} category={category} sort={sort} categories={categories} />

            <p className="mb-4 text-sm text-muted-foreground">
              {products?.length ?? 0} product{products?.length !== 1 ? 's' : ''} found
            </p>

            {products && products.length > 0 ? (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => {
                  const store = product.stores as any;
                  const images = product.product_images as any[];
                  const primaryImage = images?.find((i) => i.is_primary)?.url ?? images?.[0]?.url;
                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
                    >
                      <div className="aspect-square relative bg-muted overflow-hidden">
                        <Image
                          src={primaryImage || FALLBACK_IMG}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        {product.organic && (
                          <span className="absolute top-2 left-2 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white">
                            Organic
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground truncate">
                          {store?.name || 'Unknown store'}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary">
                          {product.name}
                        </h3>
                        <p className="mt-2 text-sm font-bold text-primary">
                          {formatNaira(product.price)}{' '}
                          <span className="text-xs font-normal text-muted-foreground">/ {product.unit}</span>
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Leaf className="size-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No products found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {q || category ? 'Try adjusting your filters or search terms.' : 'No products are available yet. Check back soon!'}
                </p>
                {(q || category) && (
                  <Button asChild variant="outline" className="mt-4">
                    <a href="/products">Clear all filters</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
