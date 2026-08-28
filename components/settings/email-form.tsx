'use client';

import { useActionState } from 'react';
import { Loader2, Mail, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { changeEmail } from '@/lib/settings/actions';
import type { SettingsActionResult } from '@/lib/settings/actions';

export function EmailForm() {
  const [state, action, pending] = useActionState<SettingsActionResult | null, FormData>(
    changeEmail,
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5" /> Change Email
        </CardTitle>
        <CardDescription>
          Your email is used for login and notifications. A verification link will be sent to your
          new address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newEmail">New Email Address</Label>
            <Input
              id="newEmail"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="new@example.com"
            />
            {state?.fieldErrors?.email && (
              <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPasswordForEmail">Current Password</Label>
            <Input
              id="confirmPasswordForEmail"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password to confirm"
            />
            {state?.fieldErrors?.password && (
              <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
            )}
          </div>

          {state?.success && (
            <p className="text-sm text-green-600 font-medium">
              Verification email sent. Check your new inbox and click the link to confirm.
            </p>
          )}
          {state?.error && !state.fieldErrors && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Sending verification...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Change Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
