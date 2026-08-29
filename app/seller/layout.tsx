import type { Metadata } from 'next';
import type { NavItem } from '@/components/layout/dashboard-nav';
import { DashboardLayout } from '../_dashboard-layout';

// Private application area: never indexed by search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

const NAV: NavItem[] = [
  { href: '/seller', label: 'Overview', icon: 'bar_chart3', exact: true },
  { href: '/seller/store', label: 'My store', icon: 'store' },
  { href: '/seller/products', label: 'Products', icon: 'package' },
  { href: '/seller/orders', label: 'Orders', icon: 'shopping_cart' },
  { href: '/seller/wallet', label: 'Wallet & settlements', icon: 'wallet' },
  { href: '/seller/messages', label: 'Messages', icon: 'message_square' },
  { href: '/seller/support', label: 'Support', icon: 'life_buoy' },
  { href: '/seller/settings', label: 'Settings', icon: 'settings' }
];

export default async function SellerLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="seller" nav={NAV}>{children}</DashboardLayout>;
}
