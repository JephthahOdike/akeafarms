import { clsx, type ClassValue } from 'clsx';

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Akea Farms';

/**
 * Normalize the configured site URL to the canonical production domain
 * (https://www.akeafarms.com) while keeping development fallbacks intact.
 */
function normalizeSiteUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    if (
      parsed.hostname === 'akeafarms.com' ||
      parsed.hostname === 'www.akeafarms.com'
    ) {
      return 'https://www.akeafarms.com';
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return 'http://localhost:3000';
  }
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
);

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format a NGN amount */
export function formatNaira(amount: number | string) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(n);
}

/** Slugify a string for URL use */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
