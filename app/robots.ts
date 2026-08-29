import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private application areas. robots.txt is a crawl hint only —
        // authentication and RLS remain the real access-control boundary.
        disallow: [
          '/admin',
          '/seller',
          '/buyer',
          '/api',
          '/cart',
          '/checkout',
          '/track',
          '/login',
          '/register',
          '/forgot-password'
        ]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
