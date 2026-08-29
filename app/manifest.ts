import type { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/utils';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} – Agricultural Marketplace`,
    short_name: SITE_NAME,
    description:
      'A trusted agricultural marketplace connecting buyers directly with verified Nigerian farmers, distributors, and agro-businesses.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#044300',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      }
    ]
  };
}
