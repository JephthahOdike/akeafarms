import type { NavItem } from '@/components/layout/dashboard-nav';
import { DashboardLayout } from '../_dashboard-layout';

const NAV: NavItem[] = [
  { href: '/buyer', label: 'Overview', icon: 'layout_dashboard', exact: true },
  { href: '/buyer/orders', label: 'My orders', icon: 'shopping_bag' },
  { href: '/buyer/wishlist', label: 'Wishlist', icon: 'heart' },
  { href: '/buyer/addresses', label: 'Addresses', icon: 'map_pin' },
  { href: '/buyer/messages', label: 'Messages', icon: 'message_square' },
  { href: '/buyer/settings', label: 'Settings', icon: 'settings' }
];

export default async function BuyerLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="buyer" nav={NAV}>{children}</DashboardLayout>;
}
