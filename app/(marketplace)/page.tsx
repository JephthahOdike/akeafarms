import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Leaf, ShieldCheck, Truck, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: { absolute: 'Fresh Farm Products Online | Akea Farms' },
  description:
    'Buy fresh farm produce, grains, vegetables, fruits, livestock and processed foods directly from verified Nigerian farmers and agro-businesses on Akea Farms.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Fresh Farm Products Online | Akea Farms',
    description:
      'An agricultural marketplace connecting buyers directly with verified Nigerian farmers, distributors, and agro-businesses.',
    url: '/',
    siteName: 'Akea Farms',
    type: 'website',
    locale: 'en_NG'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fresh Farm Products Online | Akea Farms',
    description:
      'An agricultural marketplace connecting buyers directly with verified Nigerian farmers, distributors, and agro-businesses.'
  }
};

export default async function HomePage() {
  const supabase = await createClient();
  // Featured categories (top-level only)
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, image_url')
    .is('parent_id', null)
    .eq('is_active', true)
    .order('sort_order')
    .limit(8);

  // Category images from asset spec (slug → Unsplash URL)
  const CATEGORY_IMAGES: Record<string, string> = {
    'grains-cereals': 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=256&q=80',
    'tubers-roots': 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=256&q=80',
    'vegetables': 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=256&q=80',
    'fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=256&q=80',
    'livestock': 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=256&q=80',
    'poultry': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=256&q=80',
    'cash-crops': 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=256&q=80',
    'processed-foods': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=256&q=80'
  };

  // Featured products
  const { data: featured } = await supabase
    .from('products')
    .select(
      'id, name, slug, price, currency, unit, organic, quality_grade, product_images(url, is_primary)'
    )
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(8);

  return (
    <div>
      {/* Structured data for search engines */}
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Leaf className="size-3.5" /> Nigeria&apos;s Agricultural
                Marketplace
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Farm-fresh produce,
                <br />
                <span className="text-primary">direct from the source.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Buy directly from verified Nigerian farmers, distributors and
                agro-businesses. Track every order, pay securely, and support
                local agriculture.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-10 px-6 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                >
                  Start shopping <ArrowRight className="ml-1 size-4" />
                </Link>
                <Link
                  href="/register?role=seller"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-10 px-6 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground"
                >
                  Become a seller
                </Link>
              </div>

              <ul className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                {[
                  {
                    icon: ShieldCheck,
                    title: 'Verified sellers',
                    sub: 'KYC & farm checks'
                  },
                  {
                    icon: Truck,
                    title: 'Nationwide delivery',
                    sub: 'Track every shipment'
                  },
                  {
                    icon: Star,
                    title: 'Buyer protection',
                    sub: 'Refund on damaged goods'
                  }
                ].map((f) => (
                  <li
                    key={f.title}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <f.icon className="size-5 text-primary" />
                    <p className="mt-2 font-semibold text-foreground">
                      {f.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{f.sub}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-secondary shadow-xl ring-1 ring-border">
              <Image
                src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=80"
                alt="Farmer with fresh produce"
                fill
                priority
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================ CATEGORIES ============================ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Shop by category
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore produce, grains, livestock and more.
            </p>
          </div>
          <Link
            href="/categories"
            className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            All categories →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories && categories.length > 0
            ? categories.map((c) => {
                const imgSrc = c.image_url || CATEGORY_IMAGES[c.slug];
                return (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <div className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary overflow-hidden">
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={c.name}
                        width={64}
                        height={64}
                        className="size-16 rounded-full object-cover"
                      />
                    ) : (
                      <Leaf className="size-6" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary">
                    {c.name}
                  </p>
                </Link>
              )})
            : PLACEHOLDER_CATEGORIES.map((c) => (
                <div
                  key={c.name}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-5 text-center"
                >
                  <div className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                    <Leaf className="size-6" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {c.name}
                  </p>
                </div>
              ))}
        </div>
      </section>

      {/* ============================ FEATURED ============================ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Featured this week
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hand-picked, in-season, and ready to ship.
            </p>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            View all →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured && featured.length > 0
            ? featured.map((p) => {
                const img = p.product_images?.find((i) => i.is_primary) ??
                  p.product_images?.[0];
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40"
                  >
                    <div className="relative aspect-square bg-secondary">
                      {img?.url && (
                        <Image
                          src={img.url}
                          alt={p.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(min-width: 1024px) 25vw, 50vw"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary">
                        {p.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        ₦{Number(p.price).toLocaleString()} / {p.unit}
                      </p>
                    </div>
                  </Link>
                );
              })
            : PLACEHOLDER_PRODUCTS.map((p) => (
                <div
                  key={p.name}
                  className="overflow-hidden rounded-2xl border border-dashed border-border bg-card/50"
                >
                  <div className="aspect-square bg-secondary" />
                  <div className="p-4">
                    <p className="text-sm font-semibold text-muted-foreground">
                      {p.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {p.price}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* ============================ SELLERS CTA ============================ */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Sell your harvest to thousands of buyers.
              </h2>
              <p className="mt-3 text-primary-foreground/90 max-w-xl">
                Set up your store in minutes, list unlimited products, manage
                orders, and get paid securely. We handle payments, you grow the
                food.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/register?role=seller"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-10 px-6 bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80"
              >
                Become a seller
              </Link>
              <Link
                href="/seller/fees"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-10 px-6 border border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                How fees work
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const PLACEHOLDER_CATEGORIES = [
  { name: 'Grains & Cereals' },
  { name: 'Tubers & Roots' },
  { name: 'Vegetables' },
  { name: 'Fruits' },
  { name: 'Livestock' },
  { name: 'Poultry' },
  { name: 'Cash Crops' },
  { name: 'Processed Foods' }
];

const PLACEHOLDER_PRODUCTS = [
  { name: 'Ofada Rice', price: 'From ₦8,500 / bag' },
  { name: 'Fresh Tomatoes', price: 'From ₦3,200 / basket' },
  { name: 'Red Palm Oil', price: 'From ₦2,800 / litre' },
  { name: 'Yellow Garri', price: 'From ₦4,500 / bag' }
];
