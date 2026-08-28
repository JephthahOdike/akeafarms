import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getNotifications } from '@/lib/notifications/actions';
import { NotificationItem } from '@/components/notifications/notification-item';
import { MarkAllReadButton } from '@/components/notifications/mark-all-read';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Shared notification center used by buyer, seller and admin/employee areas.
 * All data access is scoped to the signed-in user via RLS, so the same
 * component safely serves every role.
 */
export async function NotificationCenter({
  basePath,
  page = 1
}: {
  basePath: string;
  page?: number;
}) {
  const { items, hasMore, unreadCount } = await getNotifications(page);
  const hasPrev = page > 1;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.`
              : 'Updates about your account, orders and payments.'}
          </p>
        </div>
        <MarkAllReadButton unreadCount={unreadCount} />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Bell className="size-10 text-muted-foreground/40" />
          <p className="mt-3 font-medium">No notifications yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Updates about orders, payments and your account will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}

      {(hasPrev || hasMore) && (
        <div className="mt-6 flex items-center justify-between">
          {hasPrev ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`${basePath}?page=${page - 1}`}>
                <ChevronLeft className="size-4" /> Newer
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {hasMore && (
            <Button asChild variant="outline" size="sm">
              <Link href={`${basePath}?page=${page + 1}`}>
                Older <ChevronRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      )}

      {items.length > 0 && unreadCount === 0 && (
        <p className={cn('mt-4 text-center text-xs text-muted-foreground')}>
          You&apos;re all caught up.
        </p>
      )}
    </div>
  );
}
