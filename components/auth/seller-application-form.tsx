'use client';

import { useActionState, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitSellerApplicationAction, type ActionState } from '@/lib/auth/actions';

const BUSINESS_TYPES = [
  'Farmer',
  'Cooperative',
  'Distributor',
  'Wholesaler',
  'Agro-processor',
  'Livestock producer',
  'Poultry farmer',
  'Other'
];

export function SellerApplicationForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    submitSellerApplicationAction,
    {}
  );
  const [type, setType] = useState(BUSINESS_TYPES[0]);
  const fieldErrors = state?.fieldErrors ?? {};

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h2 className="mt-3 text-lg font-semibold text-foreground">
          Application submitted
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.error /* server may put a message here */}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8">
      {/* BUSINESS */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">
          Business details
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="business_name">Business name *</Label>
            <Input
              id="business_name"
              name="business_name"
              required
              placeholder="e.g. Adesina Farms Ltd."
            />
            {fieldErrors.business_name && (
              <p className="text-xs text-destructive">
                {fieldErrors.business_name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_type">Business type *</Label>
            <select
              id="business_type"
              name="business_type"
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="years_of_experience">Years of experience</Label>
            <Input
              id="years_of_experience"
              name="years_of_experience"
              type="number"
              min={0}
              max={80}
              placeholder="e.g. 5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cac_number">
              CAC number <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="cac_number" name="cac_number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tin">
              TIN <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="tin" name="tin" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">Short bio</Label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="Tell buyers who you are and what you grow."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* STORE */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">
          Your store
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="store_name">Store name *</Label>
            <Input
              id="store_name"
              name="store_name"
              required
              placeholder="e.g. Adesina Farms"
            />
            {fieldErrors.store_name && (
              <p className="text-xs text-destructive">
                {fieldErrors.store_name}
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="store_description">Store description</Label>
            <textarea
              id="store_description"
              name="store_description"
              rows={3}
              placeholder="What can buyers expect from your store?"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="farm_name">Farm name</Label>
            <Input id="farm_name" name="farm_name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="farm_state">State</Label>
            <Input id="farm_state" name="farm_state" placeholder="e.g. Oyo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="farm_lga">LGA</Label>
            <Input id="farm_lga" name="farm_lga" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="farm_location">Address / location</Label>
            <Input id="farm_location" name="farm_location" />
          </div>
        </div>
      </fieldset>

      {state?.error && !state.fieldErrors && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Submitting…
          </>
        ) : (
          'Submit application'
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Your store will be marked <strong>pending</strong> until our team
        reviews your application. You can start adding products right away.
      </p>
    </form>
  );
}
