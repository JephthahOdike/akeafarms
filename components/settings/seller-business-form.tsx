'use client';

import { useActionState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSellerBusinessProfile } from '@/lib/settings/actions';
import type { SellerProfile, SettingsActionResult } from '@/lib/settings/actions';

export function SellerBusinessForm({
  profile
}: {
  profile: SellerProfile;
}) {
  const [state, formAction, pending] = useActionState<
    SettingsActionResult | null,
    FormData
  >(updateSellerBusinessProfile, null);

  const businessTypes = [
    { value: '', label: 'Select type...' },
    { value: 'farmer', label: 'Farmer' },
    { value: 'distributor', label: 'Distributor' },
    { value: 'wholesaler', label: 'Wholesaler' },
    { value: 'processor', label: 'Processor' },
    { value: 'aggregator', label: 'Aggregator' },
    { value: 'retailer', label: 'Retailer' }
  ];

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="business_name">Business Name *</Label>
        <Input
          id="business_name"
          name="business_name"
          required
          defaultValue={profile.business_name}
        />
        {state?.fieldErrors?.business_name && (
          <p className="text-xs text-destructive">{state.fieldErrors.business_name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_type">Business Type</Label>
        <select
          id="business_type"
          name="business_type"
          defaultValue={profile.business_type || ''}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {businessTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cac_number">CAC Registration Number</Label>
          <Input
            id="cac_number"
            name="cac_number"
            defaultValue={profile.cac_number || ''}
            placeholder="e.g. RC 123456"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tin">Tax ID (TIN)</Label>
          <Input
            id="tin"
            name="tin"
            defaultValue={profile.tin || ''}
            placeholder="Tax Identification Number"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="years_of_experience">Years of Experience</Label>
        <Input
          id="years_of_experience"
          name="years_of_experience"
          type="number"
          min={0}
          max={99}
          defaultValue={profile.years_of_experience ?? ''}
          className="max-w-[120px]"
        />
        {state?.fieldErrors?.years_of_experience && (
          <p className="text-xs text-destructive">{state.fieldErrors.years_of_experience}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Short Bio</Label>
        <Input
          id="bio"
          name="bio"
          defaultValue={profile.bio || ''}
          maxLength={500}
          placeholder="A short description of your business"
        />
        {state?.fieldErrors?.bio && (
          <p className="text-xs text-destructive">{state.fieldErrors.bio}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="story">Your Story</Label>
        <textarea
          id="story"
          name="story"
          defaultValue={profile.story || ''}
          maxLength={2000}
          rows={4}
          placeholder="Share your journey — how you got started, your farming philosophy, what makes your produce special..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {state?.fieldErrors?.story && (
          <p className="text-xs text-destructive">{state.fieldErrors.story}</p>
        )}
      </div>

      {state?.success && (
        <p className="text-sm text-green-600 font-medium">Business profile updated.</p>
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
            <Save className="mr-2 size-4" /> Save Business Profile
          </>
        )}
      </Button>
    </form>
  );
}
