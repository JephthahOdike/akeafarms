'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Loader2, Store, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerAction, type ActionState } from '@/lib/auth/actions';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types/database';

export function RegisterForm({ defaultRole = 'buyer' }: { defaultRole?: UserRole }) {
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    registerAction,
    {}
  );
  const fieldErrors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5">
      {/* Hidden role field */}
      <input type="hidden" name="role" value={role} />

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3">
        <RoleOption
          active={role === 'buyer'}
          onClick={() => setRole('buyer')}
          icon={ShoppingBag}
          title="I'm a buyer"
          sub="Buy produce"
        />
        <RoleOption
          active={role === 'seller'}
          onClick={() => setRole('seller')}
          icon={Store}
          title="I'm a seller"
          sub="Sell produce"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          required
          autoComplete="name"
          aria-invalid={!!fieldErrors.full_name}
        />
        {fieldErrors.full_name && (
          <p className="text-xs text-destructive">{fieldErrors.full_name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="08012345678"
          autoComplete="tel"
          aria-invalid={!!fieldErrors.phone}
        />
        {fieldErrors.phone && (
          <p className="text-xs text-destructive">{fieldErrors.phone}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          aria-invalid={!!fieldErrors.password}
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters.
        </p>
        {fieldErrors.password && (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        )}
      </div>

      {state?.error && !state.fieldErrors && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Creating account…
          </>
        ) : (
          'Create account'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

function RoleOption({
  active,
  onClick,
  icon: Icon,
  title,
  sub
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-colors',
        active
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40'
      )}
    >
      <Icon className="size-6" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs">{sub}</p>
      </div>
    </button>
  );
}
