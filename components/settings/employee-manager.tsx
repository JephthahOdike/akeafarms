'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, UserCog, Check, Loader2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  grantPermission,
  revokePermission,
  upgradeToEmployee
} from '@/lib/settings/actions';
import type { EmployeeWithPermissions } from '@/lib/settings/actions';

const PERMISSIONS = [
  { key: 'orders.view', label: 'View Orders' },
  { key: 'orders.manage', label: 'Manage Orders' },
  { key: 'products.manage', label: 'Manage Products' },
  { key: 'sellers.manage', label: 'Manage Sellers' },
  { key: 'users.manage', label: 'Manage Users' },
  { key: 'payments.view', label: 'View Payments' },
  { key: 'support.manage', label: 'Manage Support' },
  { key: 'reports.view', label: 'View Reports' },
  { key: 'settings.manage', label: 'Manage Settings' }
];

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    employee: 'bg-blue-100 text-blue-800 border-blue-200',
    seller: 'bg-amber-100 text-amber-800 border-amber-200',
    buyer: 'bg-muted text-muted-foreground border-border'
  };
  return `inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${colors[role] || colors.buyer}`;
}

export function EmployeeManager({
  employees
}: {
  employees: EmployeeWithPermissions[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleTogglePerm = (
    employeeId: string,
    permission: string,
    hasIt: boolean
  ) => {
    startTransition(async () => {
      if (hasIt) {
        await revokePermission(employeeId, permission);
      } else {
        await grantPermission(employeeId, permission);
      }
      router.refresh();
    });
  };

  const handleUpgrade = (userId: string) => {
    if (!confirm('Upgrade this user to employee? They will gain access to the admin dashboard.')) return;
    startTransition(async () => {
      await upgradeToEmployee(userId);
      router.refresh();
    });
  };

  if (employees.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No users with employee access yet.</p>
    );
  }

  return (
    <div className="space-y-6">
      {employees.map((emp) => (
        <div
          key={emp.id}
          className="rounded-lg border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{emp.full_name}</span>
                <span className={roleBadge(emp.role)}>{emp.role}</span>
              </div>
              <p className="text-xs text-muted-foreground">{emp.email}</p>
            </div>

            {emp.role !== 'employee' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleUpgrade(emp.id)}
                disabled={isPending}
              >
                <ArrowUpRight className="mr-1 size-3.5" />
                Make Employee
              </Button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Shield className="size-3.5" />
                Employee
              </span>
            )}
          </div>

          {emp.role === 'employee' && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PERMISSIONS.map((perm) => {
                const hasIt = emp.permissions.includes(perm.key);
                return (
                  <label
                    key={perm.key}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={hasIt}
                      onChange={() =>
                        handleTogglePerm(emp.id, perm.key, hasIt)
                      }
                      disabled={isPending}
                      className="size-3.5 rounded accent-primary"
                    />
                    <span className="text-xs select-none">{perm.label}</span>
                    {hasIt && <Check className="size-3 text-primary ml-auto" />}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
