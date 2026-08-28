import Link from 'next/link';
import { LogOut, Bell, Settings } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { UserMenu } from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/lib/auth/actions';
import { getUnreadCount } from '@/lib/notifications/actions';
import type { Profile } from '@/lib/types/database';

function getRoleUrl(role: string, suffix: string) {
  switch (role) {
    case 'seller':
      return `/seller/${suffix}`;
    case 'admin':
      return `/admin/${suffix}`;
    default:
      return `/buyer/${suffix}`;
  }
}

function getNotificationsUrl(role: string) {
  switch (role) {
    case 'seller':
      return '/seller/notifications';
    case 'admin':
    case 'employee':
      return '/admin/notifications';
    default:
      return '/buyer/notifications';
  }
}

export async function DashboardTopbar({
  profile,
  title,
  subtitle
}: {
  profile: Profile;
  title?: string;
  subtitle?: string;
}) {
  const notificationsUrl = getNotificationsUrl(profile.role);
  const settingsUrl = getRoleUrl(profile.role, 'settings');
  const unreadCount = await getUnreadCount().catch(() => 0);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo className="lg:hidden" showText={false} />
        {title && (
          <div className="hidden md:block">
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            className="relative"
          >
            <Link href={notificationsUrl}>
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Settings">
            <Link href={settingsUrl}>
              <Settings className="size-4" />
            </Link>
          </Button>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
          <UserMenu profile={profile} />
        </div>
      </div>
    </header>
  );
}
