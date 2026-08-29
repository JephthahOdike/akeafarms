import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Leaf, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatNaira } from '@/lib/utils';
import SortSelect from '../_sort-select';
import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/utils';
import { breadcrumbJsonLd, itemListJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';

const CATEGORY_IMAGES: Record<string, string> = {
  'grains-cereals': 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80',
  'tubers-roots': 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=800&q=80',
  'vegetables': 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=800&q=80',
  'fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80',
  'livestock': 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&q=80',
  'poultry': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=80',
  'cash-crops': 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=80',
  'processed-foods': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, description')
    .eq('slug', slug)
    .maybeSingle();

  if (!category) {
    return {
      title: 'Category not found',
      robots: { index: false, follow: false }
    };
  }

  // Include subcategories so parent categories that only hold subcategory
  // products are still counted as having content.
  const { data: subCategories } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', category.id);

  const categoryIds = [category.id, ...(subCategories?.map((c) => c.id) ?? [])];
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .in('category_id', categoryIds)
    .eq('status', 'active');

  const title = category.name;
  const description =
    category.description?.trim() ||
    `Browse ${category.name.toLowerCase()} from verified Nigerian farmers and agro-businesses on ${SITE_NAME}.`;

  return {
    title,
    description,
    // Empty categories are thin content: keep links crawlable, skip indexing.
    robots: (count ?? 0) === 0 ? { index: false, follow: true } : undefined,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      title,
      description,
      url: `/categories/${slug}`,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_NG'
    },
    twitter: { card: 'summary_large_image', title, description }
  };
}

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort } = await searchParams;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url')
    .eq('slug', slug)
    .single();

  if (!category) notFound();

  // Get subcategory IDs too
  const { data: subCat } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', category.id);

  const catIds = [category.id, ...(subCat?.map((c) => c.id) ?? [])];

  // Fetch products
  let query = supabase
    .from('products')
    .select(
      `id, name, slug, price, currency, unit, organic,
       product_images(url, is_primary),
       stores!inner(name, slug)`
    )
    .in('category_id', catIds)
    .eq('status', 'active');

  switch (sort) {
    case 'price_asc': query = query.order('price', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    default: query = query.order('created_at', { ascending: false });
  }

  const { data: products } = await query.limit(48);
  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1610348725531-477418e73c9a?w=400&q=80';
  const bannerImg = category.image_url || CATEGORY_IMAGES[slug];

  return (
    <div>
      {/* Category header */}
      <div className="relative h-48 sm:h-64 overflow-hidden bg-muted">
        {bannerImg && (
          <Image
            src={bannerImg}
            alt={category.name}
            fill
            className="object-cover opacity-60"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full px-4 sm:px-6 lg:px-8 pb-6">
          <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
              Home
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              href="/categories"
              className="text-muted-foreground hover:text-foreground"
            >
              All Categories
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{category.name}</span>
          </nav>
          <h1 className="text-3xl font-bold">{category.name}</h1>
          {category.description && (
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">{category.description}</p>
          )}
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Sort */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {products?.length ?? 0} product{products?.length !== 1 ? 's' : ''}
            </p>
            <SortSelect slug={slug} sort={sort} />
          </div>

          {products && products.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
                        <span className="absolute top-2 left-2 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white">Organic</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground truncate">{store?.name || 'Unknown'}</p>
                      <h3 className="mt-1 text-sm font-semibold line-clamp-2 group-hover:text-primary">{product.name}</h3>
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Leaf className="size-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">No products in this category yet. Check back soon!</p>
              <Link href="/products" className="mt-4 text-sm text-primary hover:underline">Browse all products</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
