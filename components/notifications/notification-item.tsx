'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CreditCard,
  Megaphone,
  Package,
  Tag,
  Truck,
  Wallet
} from 'lucide-react';
import { markNotificationRead } from '@/lib/notifications/actions';
import type { Notification } from '@/lib/types/database';
import { cn } from '@/lib/utils';

const TYPE_ICONS = {
  order: Package,
  payment: CreditCard,
  shipment: Truck,
  settlement: Wallet,
  promotion: Tag,
  announcement: Megaphone,
  system: Bell
} as const;

const TYPE_STYLES: Record<string, string> = {
  order: 'bg-blue-100 text-blue-700',
  payment: 'bg-emerald-100 text-emerald-700',
  shipment: 'bg-sky-100 text-sky-700',
  settlement: 'bg-emerald-100 text-emerald-700',
  promotion: 'bg-amber-100 text-amber-700',
  announcement: 'bg-purple-100 text-purple-700',
  system: 'bg-gray-100 text-gray-700'
};

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function NotificationItem({ notification }: { notification: Notification }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const style = TYPE_STYLES[notification.type] ?? TYPE_STYLES.system;

  function open() {
    startTransition(async () => {
      if (!notification.is_read) {
        await markNotificationRead(notification.id);
        router.refresh();
      }
      if (notification.link) router.push(notification.link);
    });
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={pending}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border border-transparent p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-60',
        !notification.is_read && 'bg-muted/30'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
          style
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {!notification.is_read && (
            <span className="size-2 shrink-0 rounded-full bg-red-600" aria-hidden />
          )}
          <span
            className={cn(
              'truncate text-sm',
              notification.is_read ? 'font-normal' : 'font-semibold'
            )}
          >
            {notification.title}
          </span>
        </span>
        <span className="mt-0.5 block line-clamp-2 text-sm text-muted-foreground">
          {notification.body}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground/80">
          {timeAgo(notification.created_at)}
        </span>
      </span>
    </button>
  );
}
