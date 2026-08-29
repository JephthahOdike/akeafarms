'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Check,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  UserX,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  grantPermission,
  revokePermission,
  upgradeToEmployee,
  deactivateEmployee,
  reactivateEmployee,
  downgradeEmployee
} from '@/lib/settings/actions';
import { EMPLOYEE_PERMISSIONS } from '@/lib/auth/permissions';
import type { EmployeeWithPermissions } from '@/lib/settings/actions';

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

  const run = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  };

  const handleTogglePerm = (
    employeeId: string,
    permission: string,
    hasIt: boolean
  ) => {
    run(() =>
      hasIt
        ? revokePermission(employeeId, permission)
        : grantPermission(employeeId, permission)
    );
  };

  const handleUpgrade = (userId: string) => {
    if (!confirm('Upgrade this user to employee? They will gain access to the admin dashboard.'))
      return;
    run(() => upgradeToEmployee(userId));
  };

  const handleDeactivate = (userId: string) => {
    if (
      !confirm(
        'Deactivate this employee? They will be signed out and unable to log in. Their permissions are preserved.'
      )
    )
      return;
    run(() => deactivateEmployee(userId));
  };

  const handleReactivate = (userId: string) => {
    run(() => reactivateEmployee(userId));
  };

  const handleDowngrade = (userId: string) => {
    if (
      !confirm(
        'Remove employee status? Their role will revert and ALL permissions will be revoked. This cannot be undone.'
      )
    )
      return;
    run(() => downgradeEmployee(userId));
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
                {emp.role === 'employee' && !emp.is_active && (
                  <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    Deactivated
                  </span>
                )}
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
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="size-3.5" />
                  Employee
                </span>
                {emp.is_active ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeactivate(emp.id)}
                    disabled={isPending}
                  >
                    <UserX className="mr-1 size-3.5" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleReactivate(emp.id)}
                    disabled={isPending}
                  >
                    <UserCheck className="mr-1 size-3.5" />
                    Reactivate
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDowngrade(emp.id)}
                  disabled={isPending}
                >
                  <ArrowDownRight className="mr-1 size-3.5" />
                  Remove Employee
                </Button>
              </div>
            )}
          </div>

          {emp.role === 'employee' && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {EMPLOYEE_PERMISSIONS.map((perm) => {
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
          {isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Updating…
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
