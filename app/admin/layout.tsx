import type { NavItem } from '@/components/layout/dashboard-nav';
import { requireRole } from '@/lib/auth/helpers';
import { DashboardLayout } from '../_dashboard-layout';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: 'bar_chart3', exact: true },
  { href: '/admin/users', label: 'Users', icon: 'users' },
  { href: '/admin/sellers', label: 'Sellers', icon: 'shield_check' },
  { href: '/admin/products', label: 'Products', icon: 'package' },
  { href: '/admin/orders', label: 'Orders', icon: 'shopping_cart' },
  { href: '/admin/categories', label: 'Categories', icon: 'tag' },
  { href: '/admin/settlements', label: 'Settlements', icon: 'wallet' },
  { href: '/admin/payments', label: 'Payments', icon: 'receipt' },
  { href: '/admin/tracking', label: 'Tracking', icon: 'truck' },
  { href: '/admin/reports', label: 'Reports', icon: 'bar_chart3' },
  { href: '/admin/support', label: 'Support', icon: 'message_square' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' }
];

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Server-side defense-in-depth: middleware is the first layer, this is the
  // second. Employees are admitted here but per-permission enforcement happens
  // in each server action (Phase 8 scope).
  await requireRole(['admin', 'employee']);
  return <DashboardLayout role="admin" nav={NAV}>{children}</DashboardLayout>;
}
