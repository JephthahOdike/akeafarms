import type { Metadata } from 'next';
import type { NavItem } from '@/components/layout/dashboard-nav';
import { requireRole, hasPermission } from '@/lib/auth/helpers';
import { MODULE_PERMISSIONS } from '@/lib/auth/permissions';
import { DashboardLayout } from '../_dashboard-layout';

// Private application area: never indexed by search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

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
  { href: '/admin/messages', label: 'Messages', icon: 'messages_square' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' }
];

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Server-side defense-in-depth: middleware is the first layer, this is the
  // second. Employees are admitted here but per-permission enforcement happens
  // in each page and server action (Phase 10 scope).
  const user = await requireRole(['admin', 'employee']);

  // Employees only see the modules their permissions unlock; admins see all.
  let nav = NAV;
  if (user.profile.role === 'employee') {
    const visible = await Promise.all(
      NAV.map(async (item) => {
        const perms = MODULE_PERMISSIONS[item.href];
        if (!perms) return null; // admin-only module (e.g. /admin/settings)
        for (const perm of perms) {
          if (await hasPermission(perm)) return item;
        }
        return null;
      })
    );
    nav = visible.filter((item): item is NavItem => item !== null);
  }

  return <DashboardLayout role="admin" nav={nav}>{children}</DashboardLayout>;
}
