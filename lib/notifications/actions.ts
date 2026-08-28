'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/helpers';
import type { Notification } from '@/lib/types/database';

/**
 * Notification server actions.
 *
 * Isolation model:
 * - All queries run through the RLS-enabled server client ("notifications own"
 *   policy: auth.uid() = user_id), so users can only ever see/modify their own
 *   notifications — even if application code were buggy.
 * - `.eq('user_id', user.id)` is applied as defence in depth.
 * - Admins/employees receive only notifications explicitly targeted at their
 *   own user id (e.g. new seller applications); they never gain access to
 *   other users' notifications.
 */

const PAGE_SIZE = 20;

export type NotificationsPage = {
  items: Notification[];
  hasMore: boolean;
  unreadCount: number;
};

function notificationPaths() {
  return ['/buyer/notifications', '/seller/notifications', '/admin/notifications'];
}

export async function getNotifications(page = 1): Promise<NotificationsPage> {
  const user = await getCurrentUser();
  if (!user) return { items: [], hasMore: false, unreadCount: 0 };

  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;

  // Fetch PAGE_SIZE + 1 so we can detect whether a next page exists.
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, link, is_read, metadata, created_at')
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE);

  if (error) {
    console.error('[notifications] list error:', error.message);
    return { items: [], hasMore: false, unreadCount: 0 };
  }

  const rows = data ?? [];
  const unreadCount = await getUnreadCount();

  return {
    items: rows.slice(0, PAGE_SIZE) as Notification[],
    hasMore: rows.length > PAGE_SIZE,
    unreadCount
  };
}

export async function getUnreadCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) {
    console.error('[notifications] unread count error:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function markNotificationRead(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[notifications] mark-read error:', error.message);
    return { error: 'Failed to update notification.' };
  }

  for (const path of notificationPaths()) revalidatePath(path);
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<{
  success?: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { error: 'You must be signed in.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('[notifications] mark-all-read error:', error.message);
    return { error: 'Failed to update notifications.' };
  }

  for (const path of notificationPaths()) revalidatePath(path);
  return { success: true };
}
