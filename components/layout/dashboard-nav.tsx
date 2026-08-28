'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  MapPin,
  MessageSquare,
  User,
  Store,
  Package,
  Wallet,
  Settings,
  Users,
  ShieldCheck,
  ShoppingCart,
  Receipt,
  Truck,
  BarChart3,
  Tag,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
};

const ICON_MAP: Record<string, LucideIcon> = {
  layout_dashboard: LayoutDashboard,
  shopping_bag: ShoppingBag,
  heart: Heart,
  map_pin: MapPin,
  message_square: MessageSquare,
  user: User,
  store: Store,
  package: Package,
  wallet: Wallet,
  settings: Settings,
  users: Users,
  shield_check: ShieldCheck,
  shopping_cart: ShoppingCart,
  receipt: Receipt,
  truck: Truck,
  bar_chart3: BarChart3,
  tag: Tag
};

export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICON_MAP[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/80 hover:bg-accent hover:text-foreground'
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
