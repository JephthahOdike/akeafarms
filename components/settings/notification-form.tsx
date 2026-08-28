'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateNotificationPreferences } from '@/lib/settings/actions';
import type {
  NotificationPreferences,
  SettingsActionResult
} from '@/lib/settings/actions';

function ToggleSwitch({
  name,
  defaultChecked,
  label,
  description
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <div className="h-5 w-9 rounded-full bg-muted/80 ring-1 ring-border transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring after:absolute after:start-[2px] after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-background after:shadow-sm after:transition-transform peer-checked:after:translate-x-4" />
      </label>
    </div>
  );
}

export function NotificationForm({
  initialPreferences
}: {
  initialPreferences: NotificationPreferences;
}) {
  const [state, formAction, pending] = useActionState<
    SettingsActionResult | null,
    FormData
  >(updateNotificationPreferences, null);

  return (
    <form action={formAction}>
      <div className="divide-y divide-border">
        <ToggleSwitch
          name="order_updates"
          defaultChecked={initialPreferences.order_updates}
          label="Order Updates"
          description="Get notified when your order status changes (confirmed, shipped, delivered)."
        />
        <ToggleSwitch
          name="payment_notifications"
          defaultChecked={initialPreferences.payment_notifications}
          label="Payment Notifications"
          description="Receive confirmations when payments are processed or refunded."
        />
        <ToggleSwitch
          name="delivery_updates"
          defaultChecked={initialPreferences.delivery_updates}
          label="Delivery Updates"
          description="Track your package and get notified at each delivery milestone."
        />
        <ToggleSwitch
          name="promotional_emails"
          defaultChecked={initialPreferences.promotional_emails}
          label="Promotional Emails"
          description="Receive deals, discounts, and farm-fresh offers. We keep it light."
        />
      </div>

      {state?.success && (
        <p className="mt-4 text-sm text-green-600 font-medium">
          Preferences saved.
        </p>
      )}
      {state?.error && (
        <p className="mt-4 text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} size="sm" className="mt-5">
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Preferences'
        )}
      </Button>
    </form>
  );
}
