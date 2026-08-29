import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/helpers';
import { Button } from '@/components/ui/button';
import { formatNaira, SITE_NAME } from '@/lib/utils';
import { absoluteUrl } from '@/lib/seo';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';
import {
  Leaf,
  Star,
  ShieldCheck,
  Truck,
  ChevronLeft,
  ShoppingCart,
  MessageSquare,
  Package,
  MapPin,
  Calendar,
  Award,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1610348725531-477418e73c9a?w=400&q=80';

/* ------------------------------------------------------------------ */
/*  generateMetadata                                                   */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('name, description, product_images(url)')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();

  if (!product) {
    return {
      title: 'Product not found',
      robots: { index: false, follow: false }
    };
  }

  const images = (product.product_images as { url: string }[] | null) ?? [];
  const primaryImage = images.find((image) => image.url)?.url;
  const description =
    product.description?.replace(/\s+/g, ' ').trim().slice(0, 157).trim() ||
    `Buy ${product.name} fresh from verified Nigerian farmers on ${SITE_NAME}.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `/products/${slug}`,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_NG',
      ...(primaryImage ? { images: [{ url: absoluteUrl(primaryImage) }] } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description
    }
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  /* ----- product + store + images + seller profile ----- */
  const user = await getCurrentUser();
  const { data: product } = await supabase
    .from('products')
    .select(
      `id, name, slug, description, price, compare_at_price, currency, unit,
       weight_kg, quality_grade, organic, packaging_info, harvest_date,
       available_from, status, store_id, category_id,
       product_images(url, alt_text, is_primary),
       stores!inner(id, name, slug, seller_id, logo_url, farm_name, farm_state,
         organic_certified)`
    )
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();

  if (!product) notFound();

  const productName = product.name as string;
  const productPrice = Number(product.price);
  const productCompareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const productUnit = product.unit as string;
  const productCurrency = product.currency as string;
  const productDescription = product.description as string | null;
  const productQuality = product.quality_grade as string | null;
  const productOrganic = (product.organic as boolean) ?? false;
  const productPackaging = product.packaging_info as string | null;
  const productWeight = product.weight_kg ? Number(product.weight_kg) : null;
  const productHarvest = product.harvest_date as string | null;
  const productAvailable = product.available_from as string | null;

  const storeArr = product.stores as unknown as Record<string, unknown>[];
  const store = storeArr?.[0] ?? {};
  const storeName = store.name as string;
  const storeSlug = store.slug as string;
  const storeLogo = store.logo_url as string | null;
  const farmName = store.farm_name as string | null;
  const farmState = store.farm_state as string | null;
  const organicCertified = (store.organic_certified as boolean) ?? false;
  const storeSellerId = store.seller_id as string | undefined;
  const sellerInfo = storeSellerId
    ? (((
        await supabase.rpc('get_public_seller_info', {
          seller_profile_id: storeSellerId
        })
      ).data?.[0] as Record<string, unknown> | undefined))
    : undefined;
  const sellerBusinessName = sellerInfo?.business_name as string | undefined;
  const sellerYears = sellerInfo?.years_of_experience as number | undefined;
  const sellerStatus = sellerInfo?.status as string | undefined;

  // Sort images: primary first, then by natural order
  const images = (
    (product.product_images as Record<string, unknown>[]) ?? []
  ).sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return 0;
  });

  const mainImage = images.length > 0 ? (images[0].url as string) : null;
  const thumbnails =
    images.length > 1 ? images.slice(1).map((img) => img.url as string) : [];

  /* ----- related products (same category) ----- */
  const { data: relatedProducts } = await supabase
    .from('products')
    .select(
      `id, name, slug, price, compare_at_price, currency, unit, weight_kg,
       organic, quality_grade,
       product_images(url, alt_text, is_primary)`
    )
    .eq('category_id', product.category_id)
    .eq('status', 'active')
    .neq('id', product.id)
    .limit(6);

  /* ----- store's other products ----- */
  const { data: storeProducts } = await supabase
    .from('products')
    .select(
      `id, name, slug, price, compare_at_price, currency, unit, weight_kg,
       organic, quality_grade,
       product_images(url, alt_text, is_primary)`
    )
    .eq('store_id', product.store_id)
    .eq('status', 'active')
    .neq('id', product.id)
    .limit(4);

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Structured data: Product + BreadcrumbList */}
      <JsonLd
        data={productJsonLd({
          name: productName,
          slug: product.slug as string,
          description: productDescription,
          price: productPrice,
          currency: productCurrency,
          status: (product.status as string | null) ?? null,
          images: images.map((img) => ({
            url: (img.url as string | null) ?? null,
            alt_text: (img.alt_text as string | null) ?? null
          }))
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Products', path: '/products' },
          { name: productName, path: `/products/${slug}` }
        ])}
      />

      {/* ----- Breadcrumb ----- */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-primary transition-colors">
          Products
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {productName}
        </span>
      </nav>

      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ChevronLeft className="size-4" />
        Back to products
      </Link>

      {/* ----- Hero: images + info ----- */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image gallery */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted">
            <Image
              src={mainImage ?? FALLBACK_IMAGE}
              alt={(images[0]?.alt_text as string) ?? productName}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>

          {thumbnails.length > 0 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {thumbnails.map((url, i) => (
                <div
                  key={i}
                  className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                >
                  <Image
                    src={url}
                    alt={`${productName} ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex flex-col gap-5">
          {/* Store link */}
          {storeName && (
            <Link
              href={`/store/${storeSlug}`}
              className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
            >
              {storeName}
            </Link>
          )}

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {productName}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              {formatNaira(productPrice)}
            </span>
            {productCompareAt && productCompareAt > productPrice && (
              <span className="text-lg text-muted-foreground line-through">
                {formatNaira(productCompareAt)}
              </span>
            )}
            {productCompareAt && productCompareAt > productPrice && (
              <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                {Math.round(
                  ((productCompareAt - productPrice) /
                    productCompareAt) *
                    100
                )}
                % off
              </span>
            )}
          </div>

          {/* Key details */}
          <div className="flex flex-wrap gap-2">
            {productUnit && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Package className="size-3" />
                per {productUnit}
              </span>
            )}
            {productWeight != null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                {productWeight} kg
              </span>
            )}
            {productQuality && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Award className="size-3" />
                Grade {productQuality}
              </span>
            )}
            {productOrganic && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-semibold">
                <Leaf className="size-3" />
                Organic
              </span>
            )}
            {productPackaging && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Package className="size-3" />
                {productPackaging}
              </span>
            )}
          </div>

          {/* Harvest / availability dates */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {productHarvest && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5" />
                Harvested:{' '}
                {new Date(productHarvest).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
            {productAvailable && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5" />
                Available from:{' '}
                {new Date(productAvailable).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* Add to cart + message seller */}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`/cart?add=${product.id}`}>
                <ShoppingCart className="size-5" />
                Add to Cart
              </Link>
            </Button>
            {user && (
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href={`/buyer/messages/new?product=${product.id}`}>
                  <MessageSquare className="size-5" />
                  Message Seller
                </Link>
              </Button>
            )}
          </div>

          {/* Sold by */}
          {storeName && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sold by
              </p>
              <div className="mt-3 flex items-start gap-4">
                {storeLogo ? (
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                    <Image
                      src={storeLogo}
                      alt={storeName}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                    {storeName?.charAt(0) ?? 'S'}
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    href={`/store/${storeSlug}`}
                    className="font-semibold hover:text-primary transition-colors"
                  >
                    {storeName}
                  </Link>
                  {farmName && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3" />
                      {farmName}
                      {farmState
                        ? ` · ${farmState}`
                        : ''}
                    </p>
                  )}
                  {sellerInfo && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {sellerBusinessName && (
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="size-3" />
                          {sellerBusinessName}
                        </span>
                      )}
                      {sellerYears != null && (
                        <span className="flex items-center gap-1">
                          <Star className="size-3" />
                          {sellerYears}+ years
                        </span>
                      )}
                      {sellerStatus && (
                        <span className="flex items-center gap-1">
                          <Truck className="size-3" />
                          {sellerStatus === 'approved'
                            ? 'Verified seller'
                            : sellerStatus}
                        </span>
                      )}
                    </div>
                  )}
                  {organicCertified && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold">
                      <Leaf className="size-3" />
                      Organic certified
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ----- Description ----- */}
      {productDescription && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Description</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            {productDescription}
          </p>
        </section>
      )}

      {/* ----- Store's other products ----- */}
      {storeProducts && storeProducts.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">More from this store</h2>
            <Link
              href={`/store/${storeSlug}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View store
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {storeProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ----- Related products ----- */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Related products</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ================================================================== */
/*  ProductCard – shared mini-card for related / store products        */
/* ================================================================== */

function ProductCard({
  product,
}: {
  product: Record<string, unknown>;
}) {
  const images = (
    (product.product_images as Record<string, unknown>[]) ?? []
  ).sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return 0;
  });
  const thumbnail = images.length > 0 ? (images[0].url as string) : null;
  const pName = product.name as string;
  const pSlug = product.slug as string;
  const pPrice = Number(product.price);
  const pCompareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const pUnit = product.unit as string | undefined;
  const pWeight = product.weight_kg != null ? Number(product.weight_kg) : null;
  const pOrganic = (product.organic as boolean) ?? false;

  return (
    <Link
      href={`/products/${pSlug}`}
      className="group rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-muted">
        <Image
          src={thumbnail ?? FALLBACK_IMAGE}
          alt={pName}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium">{pName}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm font-bold text-primary">
            {formatNaira(pPrice)}
          </span>
          {pCompareAt && pCompareAt > pPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatNaira(pCompareAt)}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {pUnit ? <span>Per {pUnit}</span> : null}
          {pWeight != null ? <span>· {pWeight} kg</span> : null}
          {pOrganic && (
            <span className="inline-flex items-center gap-0.5 text-green-700">
              <Leaf className="size-3" /> Organic
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
