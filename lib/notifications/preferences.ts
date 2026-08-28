import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationType } from '@/lib/types/database';

/**
 * Central notification-preference enforcement.
 *
 * Preferences are stored in `buyer_profiles.preferences` as
 * `{ notifications: NotificationPreferences }`. Although the table is named
 * `buyer_profiles`, every account (buyer, seller, employee) has a `profiles`
 * row, so this table is reused as the universal preference store keyed by
 * `user_id`. Sellers configure the same preferences from their settings page.
 */

export type NotificationPreferences = {
  order_updates: boolean;
  payment_notifications: boolean;
  delivery_updates: boolean;
  promotional_emails: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  order_updates: true,
  payment_notifications: true,
  delivery_updates: true,
  promotional_emails: false
};

/**
 * Map an in-app notification type to the preference key that gates it.
 * Returns null for types that are always allowed (announcement/system).
 */
export function preferenceKeyForType(
  type: NotificationType
): keyof NotificationPreferences | null {
  switch (type) {
    case 'order':
      return 'order_updates';
    case 'payment':
    case 'settlement':
      return 'payment_notifications';
    case 'shipment':
      return 'delivery_updates';
    case 'promotion':
      return 'promotional_emails';
    default:
      return null; // announcement, system — always notify
  }
}

export async function getNotificationPreferences(
  supabase: SupabaseClient<any>,
  userId: string
): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from('buyer_profiles')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();

  const stored = (
    data?.preferences as { notifications?: Partial<NotificationPreferences> } | undefined
  )?.notifications;

  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...stored };
}

/**
 * Return true when the user should receive a notification (in-app or email)
 * of the given type, honoring their saved preferences.
 */
export async function shouldNotify(
  supabase: SupabaseClient<any>,
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const key = preferenceKeyForType(type);
  if (!key) return true;
  const prefs = await getNotificationPreferences(supabase, userId);
  return prefs[key];
}
