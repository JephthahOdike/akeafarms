/**
 * Akea Farms — Platform Settings (server-only)
 *
 * Central key/value configuration store backed by the `platform_settings`
 * table (migration 0019). Admins write via `updatePlatformSettings` in
 * lib/settings/actions.ts; every server component/action reads through
 * this module.
 *
 * Reads use the service role client ON PURPOSE: the table's RLS grants
 * write/read only to admins, but buyer-facing surfaces (checkout) need
 * the shipping fee. The values below are configuration, not secrets —
 * nothing sensitive is stored here (Paystack/Brevo keys stay in env
 * variables and are never read through this module).
 */

import 'server-only';
import { cache } from 'react';
import { createServiceClient } from '@/lib/supabase/service';

export type PlatformSettings = {
  supportEmail: string;
  supportPhone: string;
  supportWhatsapp: string;
  shippingFlatFee: number;
  catalogAutoApproveProducts: boolean;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  supportEmail: 'help.akeafarms@gmail.com',
  supportPhone: '08029965942',
  supportWhatsapp: '08100217845',
  shippingFlatFee: 500,
  catalogAutoApproveProducts: false
};

/** Keys that may exist in platform_settings — anything else is ignored. */
export const PLATFORM_SETTING_KEYS = [
  'support_email',
  'support_phone',
  'support_whatsapp',
  'shipping_flat_fee',
  'catalog_auto_approve_products'
] as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];

/**
 * Reads all platform settings, merged over the defaults. Cached per
 * request so multiple components (checkout page + checkout API +
 * footer/contact) share one round-trip.
 */
export const getPlatformSettings = cache(async (): Promise<PlatformSettings> => {
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from('platform_settings')
      .select('key, value');

    if (error || !data) {
      console.error('[platform-settings] read error:', error?.message);
      return DEFAULT_PLATFORM_SETTINGS;
    }

    const merged: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS };
    for (const row of data as { key: string; value: unknown }[]) {
      switch (row.key) {
        case 'support_email':
          if (typeof row.value === 'string' && row.value.trim())
            merged.supportEmail = row.value.trim();
          break;
        case 'support_phone':
          if (typeof row.value === 'string' && row.value.trim())
            merged.supportPhone = row.value.trim();
          break;
        case 'support_whatsapp':
          if (typeof row.value === 'string' && row.value.trim())
            merged.supportWhatsapp = row.value.trim();
          break;
        case 'shipping_flat_fee': {
          const fee = Number(row.value);
          if (Number.isFinite(fee) && fee >= 0 && fee <= 1_000_000)
            merged.shippingFlatFee = fee;
          break;
        }
        case 'catalog_auto_approve_products':
          if (typeof row.value === 'boolean')
            merged.catalogAutoApproveProducts = row.value;
          break;
      }
    }
    return merged;
  } catch (e) {
    console.error('[platform-settings] unexpected read error:', e);
    return DEFAULT_PLATFORM_SETTINGS;
  }
});
