'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
  Store as StoreIcon,
  User
} from 'lucide-react';
import { signOutAction } from '@/lib/auth/actions';
import type { Profile } from '@/lib/types/database';
import { cn } from '@/lib/utils';

const ROLE_HOME = {
  buyer: '/buyer',
  seller: '/seller',
  admin: '/admin',
  employee: '/admin'
} as const;

const ROLE_LABEL = {
  buyer: 'Buyer',
  seller: 'Seller',
  admin: 'Admin',
  employee: 'Staff'
} as const;

export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const initials = profile.full_name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1 text-sm font-medium',
          'hover:bg-accent transition-colors'
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {initials || <User className="size-3.5" />}
        </span>
        <span className="hidden sm:inline-block max-w-[10rem] truncate">
          {profile.full_name}
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-semibold leading-tight">
                {profile.full_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile.email}
              </p>
              <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {ROLE_LABEL[profile.role]}
              </span>
            </div>

            <hr className="my-1 border-border" />

            <Link
              href={ROLE_HOME[profile.role]}
              role="menuitem"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>

            {profile.role === 'buyer' && (
              <Link
                href="/buyer/orders"
                role="menuitem"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                <ShoppingBag className="size-4" /> My orders
              </Link>
            )}
            {profile.role === 'seller' && (
              <Link
                href="/seller/orders"
                role="menuitem"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                <StoreIcon className="size-4" /> Store orders
              </Link>
            )}

            <Link
              href={`${ROLE_HOME[profile.role]}/settings`}
              role="menuitem"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <Settings className="size-4" /> Settings
            </Link>

            <hr className="my-1 border-border" />

            <form
              action={() =>
                startTransition(async () => {
                  await signOutAction();
                })
              }
            >
              <button
                type="submit"
                role="menuitem"
                disabled={pending}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <LogOut className="size-4" />
                {pending ? 'Signing out…' : 'Sign out'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

/* Inline notification-bell button (no live data in foundation phase) */
export function NotificationBell({ unread = 0 }: { unread?: number }) {
  return (
    <button
      type="button"
      aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      className="relative grid size-9 place-items-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
    >
      <Bell className="size-4" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
