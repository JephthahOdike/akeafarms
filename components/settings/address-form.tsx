'use client';

import { useActionState } from 'react';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createAddress, updateAddress } from '@/lib/settings/actions';
import type { SettingsActionResult } from '@/lib/settings/actions';
import Link from 'next/link';

type AddressFormProps =
  | { mode: 'create'; addressId?: never; defaultValues?: never }
  | { mode: 'edit'; addressId: string; defaultValues: Record<string, string | boolean | null> };

export function AddressForm(props: AddressFormProps) {
  const action =
    props.mode === 'create'
      ? createAddress
      : (_prev: SettingsActionResult | null, fd: FormData) =>
          updateAddress(props.addressId, _prev, fd);

  const [state, formAction, pending] = useActionState<SettingsActionResult | null, FormData>(
    action,
    null
  );

  const dv = props.mode === 'edit' ? props.defaultValues : {};

  const fields = {
    label: dv.label as string || '',
    recipient_name: dv.recipient_name as string || '',
    phone: dv.phone as string || '',
    address_line1: dv.address_line1 as string || '',
    address_line2: dv.address_line2 as string || '',
    city: dv.city as string || '',
    state: dv.state as string || '',
    country: (dv.country as string) || 'Nigeria',
    postal_code: dv.postal_code as string || '',
    is_default: !!dv.is_default
  };

  const formClass = 'space-y-4';

  return (
    <form action={formAction} className={formClass}>
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/buyer/addresses">
            <ArrowLeft className="mr-1 size-4" /> Back
          </Link>
        </Button>
        <h1 className="text-xl font-bold">
          {props.mode === 'create' ? 'Add Address' : 'Edit Address'}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recipient_name">Recipient Name *</Label>
          <Input id="recipient_name" name="recipient_name" required defaultValue={fields.recipient_name} />
          {state?.fieldErrors?.recipient_name && <p className="text-xs text-destructive">{state.fieldErrors.recipient_name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" name="phone" required defaultValue={fields.phone} placeholder="08029965942" />
          {state?.fieldErrors?.phone && <p className="text-xs text-destructive">{state.fieldErrors.phone}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input id="label" name="label" defaultValue={fields.label} placeholder="e.g. Home, Office" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line1">Address Line 1 *</Label>
        <Input id="address_line1" name="address_line1" required defaultValue={fields.address_line1} />
        {state?.fieldErrors?.address_line1 && <p className="text-xs text-destructive">{state.fieldErrors.address_line1}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line2">Address Line 2</Label>
        <Input id="address_line2" name="address_line2" defaultValue={fields.address_line2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input id="city" name="city" required defaultValue={fields.city} />
          {state?.fieldErrors?.city && <p className="text-xs text-destructive">{state.fieldErrors.city}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Input id="state" name="state" required defaultValue={fields.state} />
          {state?.fieldErrors?.state && <p className="text-xs text-destructive">{state.fieldErrors.state}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="postal_code">Postal Code</Label>
          <Input id="postal_code" name="postal_code" defaultValue={fields.postal_code} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input id="country" name="country" defaultValue={fields.country} />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_default"
          name="is_default"
          value="true"
          defaultChecked={fields.is_default}
          className="size-4 rounded border-border text-primary focus:ring-2 focus:ring-ring accent-primary"
        />
        <Label htmlFor="is_default" className="text-sm cursor-pointer">
          Set as default address
        </Label>
      </div>

      {state?.success && (
        <p className="text-sm text-green-600 font-medium">Address saved successfully.</p>
      )}
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 size-4" />
            {props.mode === 'create' ? 'Save Address' : 'Update Address'}
          </>
        )}
      </Button>
    </form>
  );
}
