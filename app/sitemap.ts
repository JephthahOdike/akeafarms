import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';

// Regenerated on every request so newly published public content is
// discovered without a redeploy.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.endsWith('/') ? SITE_URL : `${SITE_URL}/`;

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}categories`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}stores`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}deals`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${base}about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}help`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}help/seller`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}shipping`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}privacy`, changeFrequency: 'yearly', priority: 0.3 }
  ];

  try {
    // The RLS-protected anon client only returns publicly visible rows
    // (products with status 'active', categories/stores with is_active).
    const supabase = await createClient();

    const [{ data: categories }, { data: products }, { data: stores }] =
      await Promise.all([
        supabase
          .from('categories')
          .select('slug, updated_at')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1000),
        supabase
          .from('products')
          .select('slug, updated_at')
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(5000),
        supabase
          .from('stores')
          .select('slug, updated_at')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1000)
      ]);

    // Product slugs are unique per store, not globally: keep the first
    // entry per slug so every sitemap URL resolves to a real page.
    const seenSlugs = new Set<string>();
    const uniqueProducts = (products ?? []).filter((product) => {
      if (!product.slug || seenSlugs.has(product.slug)) return false;
      seenSlugs.add(product.slug);
      return true;
    });

    return [
      ...staticEntries,
      ...(categories ?? []).map((category) => ({
        url: `${base}categories/${category.slug}`,
        lastModified: (category.updated_at as string | null) ?? undefined,
        changeFrequency: 'daily' as const,
        priority: 0.7
      })),
      ...uniqueProducts.map((product) => ({
        url: `${base}products/${product.slug}`,
        lastModified: (product.updated_at as string | null) ?? undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.8
      })),
      ...(stores ?? []).map((store) => ({
        url: `${base}store/${store.slug}`,
        lastModified: (store.updated_at as string | null) ?? undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.6
      }))
    ];
  } catch {
    // Database unavailable: still serve the static public pages.
    return staticEntries;
  }
}
