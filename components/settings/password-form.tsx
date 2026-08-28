'use client';

import { useActionState } from 'react';
import { Loader2, Save, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { changePassword } from '@/lib/settings/actions';
import type { SettingsActionResult } from '@/lib/settings/actions';

export function PasswordForm() {
  const [state, action, pending] = useActionState<SettingsActionResult | null, FormData>(
    changePassword,
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="size-5" /> Change Password
        </CardTitle>
        <CardDescription>
          Use a strong password you don't use elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter current password"
            />
            {state?.fieldErrors?.currentPassword && (
              <p className="text-xs text-destructive">{state.fieldErrors.currentPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Min. 8 characters, upper + lower + number"
            />
            {state?.fieldErrors?.newPassword && (
              <p className="text-xs text-destructive">{state.fieldErrors.newPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Confirm new password"
            />
            {state?.fieldErrors?.confirmPassword && (
              <p className="text-xs text-destructive">{state.fieldErrors.confirmPassword}</p>
            )}
          </div>

          {state?.success && (
            <p className="text-sm text-green-600 font-medium">
              Password changed successfully. Use your new password next time you log in.
            </p>
          )}
          {state?.error && !state.fieldErrors && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Changing...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Change Password
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
