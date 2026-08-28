'use client';

import { useActionState, useEffect, useState } from 'react';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deactivateAccount } from '@/lib/settings/actions';
import type { SettingsActionResult } from '@/lib/settings/actions';

export function DeactivateForm() {
  const [state, formAction, pending] = useActionState<
    SettingsActionResult | null,
    FormData
  >(deactivateAccount, null);

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (state?.success) {
      // Redirect to home; middleware will redirect to /login since session is gone
      window.location.href = '/';
    }
  }, [state?.success]);

  if (!showForm) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">
              Once you deactivate your account, you will be signed out and your
              account will no longer be accessible. You can contact support to
              reactivate it later.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            Deactivate Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          <h3 className="font-semibold">Confirm Deactivation</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        This will immediately sign you out and deactivate your account. Your
        data will be preserved but your account will no longer be accessible.
        You can email support to request reactivation.
      </p>

      <div className="space-y-2">
        <Label htmlFor="deact_password">Your Password *</Label>
        <Input
          id="deact_password"
          name="password"
          type="password"
          required
          placeholder="Enter password to confirm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason (optional)</Label>
        <textarea
          id="reason"
          name="reason"
          rows={2}
          maxLength={300}
          placeholder="Help us improve — why are you leaving?"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Deactivating...
            </>
          ) : (
            'Yes, Deactivate My Account'
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
