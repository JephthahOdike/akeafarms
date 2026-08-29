import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/utils';

const SITE_BASE = SITE_URL.endsWith('/') ? SITE_URL : `${SITE_URL}/`;

/** Build an absolute URL against the canonical site URL. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_BASE).toString();
}

type PageMetadataOptions = {
  /** Page title. Uses the root `%s | Akea Farms` title template. */
  title?: string;
  description?: string;
  /** Canonical path WITHOUT query string, e.g. '/products'. */
  path: string;
  /** Mark the page noindex, nofollow (private / utility pages). */
  noindex?: boolean;
  /** Explicit Open Graph image URL (e.g. real product image). Optional. */
  ogImage?: string;
  ogType?: 'website' | 'article';
};

/**
 * Shared metadata builder: canonical URL, Open Graph and Twitter defaults.
 * The default OG image comes from the root `app/opengraph-image` route.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  noindex = false,
  ogImage,
  ogType = 'website'
}: PageMetadataOptions): Metadata {
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      url: path,
      siteName: SITE_NAME,
      type: ogType,
      locale: 'en_NG',
      ...(ogImage ? { images: [{ url: ogImage }] } : {})
    },
    twitter: {
      card: 'summary_large_image',
      ...(title ? { title } : {}),
      ...(description ? { description } : {})
    }
  };
}

// ---------------------------------------------------------------------------
// JSON-LD structured data builders.
// Only properties backed by real database/application data are emitted.
// ---------------------------------------------------------------------------

export type JsonLdObject = Record<string, unknown>;

export function organizationJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/logo.svg')
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl('/products?q={search_term_string}')
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export type ItemListEntry = { name: string; path: string };

export function itemListJsonLd(name: string, entries: ItemListEntry[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      url: absoluteUrl(entry.path)
    }))
  };
}

export type ProductJsonLdInput = {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string | null;
  status: string | null;
  images: { url: string | null; alt_text?: string | null }[];
};

export function productJsonLd(product: ProductJsonLdInput): JsonLdObject {
  const url = absoluteUrl(`/products/${product.slug}`);
  const availability =
    product.status === 'out_of_stock'
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/InStock';

  const data: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    offers: {
      '@type': 'Offer',
      url,
      price: product.price,
      priceCurrency: product.currency || 'NGN',
      availability,
      itemCondition: 'https://schema.org/NewCondition'
    }
  };

  if (product.description) {
    data.description = product.description;
  }

  const images = product.images
    .filter((image): image is { url: string; alt_text?: string | null } => Boolean(image.url))
    .map((image) => absoluteUrl(image.url));
  if (images.length > 0) {
    data.image = images;
  }

  return data;
}
