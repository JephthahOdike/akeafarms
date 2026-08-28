'use client';

import { useActionState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSellerBankInfo } from '@/lib/settings/actions';
import type { SellerProfile, SettingsActionResult } from '@/lib/settings/actions';

export function SellerBankForm({
  profile
}: {
  profile: SellerProfile;
}) {
  const [state, formAction, pending] = useActionState<
    SettingsActionResult | null,
    FormData
  >(updateSellerBankInfo, null);

  const hasAccount = Boolean(profile.bank_account_last4);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-md bg-muted/50 p-4 mb-4 flex gap-2.5">
        <ShieldCheck className="size-4 shrink-0 text-primary mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Your bank details are used for settlement payouts via Paystack. They are
          access-controlled, only visible to you and authorized staff, never shared
          publicly, and every change requires password confirmation and is audit-logged.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_name">Bank Name *</Label>
        <Input
          id="bank_name"
          name="bank_name"
          required
          defaultValue={profile.bank_name || ''}
          placeholder="e.g. Access Bank, GTBank"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_account_name">Account Name *</Label>
        <Input
          id="bank_account_name"
          name="bank_account_name"
          required
          defaultValue={profile.bank_account_name || ''}
          placeholder="Name as it appears on your bank account"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_account_number">
          Account Number{' '}
          {hasAccount ? (
            <span className="text-muted-foreground font-normal">
              (currently ••••{profile.bank_account_last4})
            </span>
          ) : (
            '*'
          )}
        </Label>
        <Input
          id="bank_account_number"
          name="bank_account_number"
          required={!hasAccount}
          placeholder={
            hasAccount ? 'Leave blank to keep your current account number' : '10-digit NUBAN account number'
          }
          maxLength={10}
          inputMode="numeric"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          For security we never display your full account number. Enter a new number only
          if you want to replace the one on file.
        </p>
        {state?.fieldErrors?.bank_account_number && (
          <p className="text-xs text-destructive">{state.fieldErrors.bank_account_number}</p>
        )}
      </div>

      <hr className="border-border" />

      <div className="space-y-2">
        <Label htmlFor="bank_password">
          Confirm Password <span className="text-muted-foreground font-normal">(required to save)</span>
        </Label>
        <Input
          id="bank_password"
          name="password"
          type="password"
          required
          placeholder="Enter your password to confirm changes"
        />
        {state?.error && !state.fieldErrors && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}
      </div>

      {state?.success && (
        <p className="text-sm text-green-600 font-medium">
          Bank details updated successfully.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 size-4" /> Save Bank Details
          </>
        )}
      </Button>
    </form>
  );
}
