/**
 * Akea Farms — Employee permission catalog (Phase 10)
 *
 * Single source of truth for the granular employee permissions.
 * Mirrored by RLS policies in migration 0018 via has_employee_permission().
 * Admins implicitly hold every permission (enforced server-side).
 */

export const EMPLOYEE_PERMISSIONS = [
  { key: 'users.view', label: 'View users' },
  { key: 'sellers.view', label: 'View sellers' },
  { key: 'sellers.manage', label: 'Manage sellers' },
  { key: 'products.view', label: 'View products' },
  { key: 'products.manage', label: 'Manage products & categories' },
  { key: 'orders.view', label: 'View orders' },
  { key: 'orders.manage', label: 'Manage orders' },
  { key: 'payments.view', label: 'View payments' },
  { key: 'settlements.view', label: 'View settlements' },
  { key: 'tracking.manage', label: 'Manage tracking' },
  { key: 'support.manage', label: 'Manage support' },
  { key: 'messages.view', label: 'View buyer–seller messages' },
  { key: 'reports.view', label: 'View reports' }
] as const;

export type EmployeePermission = (typeof EMPLOYEE_PERMISSIONS)[number]['key'];

export const EMPLOYEE_PERMISSION_KEYS: EmployeePermission[] =
  EMPLOYEE_PERMISSIONS.map((p) => p.key);

export function isEmployeePermission(key: string): key is EmployeePermission {
  return (EMPLOYEE_PERMISSION_KEYS as string[]).includes(key);
}

/**
 * Admin nav modules → the permissions that unlock them for employees.
 * Missing entries (e.g. /admin/settings) are admin-only.
 */
export const MODULE_PERMISSIONS: Record<string, EmployeePermission[]> = {
  '/admin/users': ['users.view'],
  '/admin/sellers': ['sellers.view', 'sellers.manage'],
  '/admin/products': ['products.view', 'products.manage'],
  '/admin/orders': ['orders.view', 'orders.manage'],
  '/admin/categories': ['products.manage'],
  '/admin/settlements': ['settlements.view'],
  '/admin/payments': ['payments.view'],
  '/admin/tracking': ['tracking.manage'],
  '/admin/reports': ['reports.view'],
  '/admin/support': ['support.manage'],
  '/admin/messages': ['messages.view']
};
