'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  updatePlatformSettings,
  sendPlatformAnnouncement,
  type SettingsActionResult
} from '@/lib/settings/actions';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

/* ------------------------------------------------------------------ */
/* General — support contact details                                   */
/* ------------------------------------------------------------------ */

export function SupportContactForm({
  supportEmail,
  supportPhone,
  supportWhatsapp
}: {
  supportEmail: string;
  supportPhone: string;
  supportWhatsapp: string;
}) {
  const [state, formAction, pending] = useActionState<
    SettingsActionResult | null,
    FormData
  >(updatePlatformSettings, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="support_email" className="text-sm font-medium">
          Support email
        </label>
        <input
          id="support_email"
          name="support_email"
          type="email"
          defaultValue={supportEmail}
          maxLength={200}
          className={inputClass}
        />
        <FieldError message={state?.fieldErrors?.support_email} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="support_phone" className="text-sm font-medium">
            Support phone
          </label>
          <input
            id="support_phone"
            name="support_phone"
            type="tel"
            defaultValue={supportPhone}
            placeholder="08029965942"
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.support_phone} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="support_whatsapp" className="text-sm font-medium">
            WhatsApp number
          </label>
          <input
            id="support_whatsapp"
            name="support_whatsapp"
            type="tel"
            defaultValue={supportWhatsapp}
            placeholder="08100217845"
            className={inputClass}
          />
          <FieldError message={state?.fieldErrors?.support_whatsapp} />
        </div>
      </div>

      {state?.success && (
        <p className="text-sm font-medium text-green-600">Contact details saved.</p>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} size="sm">
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Contact Details'
        )}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Shipping — flat delivery fee                                        */
/* ------------------------------------------------------------------ */

export function ShippingFeeForm({ fee }: { fee: string }) {
  const [state, formAction, pending] = useActionState<
    SettingsActionResult | null,
    FormData
  >(updatePlatformSettings, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="shipping_flat_fee" className="text-sm font-medium">
          Flat delivery fee (₦)
        </label>
        <input
          id="shipping_flat_fee"
          name="shipping_flat_fee"
          type="text"
          inputMode="decimal"
          defaultValue={fee}
          placeholder="500"
          className={`${inputClass} max-w-40`}
        />
        <p className="text-xs text-muted-foreground">
          Applied to every checkout. Enter a whole amount, e.g. 500.
        </p>
        <FieldError message={state?.fieldErrors?.shipping_flat_fee} />
      </div>

      {state?.success && (
        <p className="text-sm font-medium text-green-600">Delivery fee updated.</p>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} size="sm">
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Delivery Fee'
        )}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Catalog — product auto-approval                                     */
/* ------------------------------------------------------------------ */

export function CatalogAutoApproveForm({ autoApprove }: { autoApprove: boolean }) {
  const [state, formAction, pending] = useActionState<
    SettingsActionResult | null,
    FormData
  >(updatePlatformSettings, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="catalog_auto_approve_products" className="text-sm font-medium">
          New product listings
        </label>
        {/* A select (not a checkbox) so an explicit value is always posted —
            the action only persists keys present in the FormData. */}
        <select
          id="catalog_auto_approve_products"
          name="catalog_auto_approve_products"
          defaultValue={autoApprove ? 'true' : 'false'}
          className={`${inputClass} max-w-64`}
        >
          <option value="false">Require admin review before going live</option>
          <option value="true">Auto-approve immediately</option>
        </select>
        <p className="text-xs text-muted-foreground">
          When review is required, new seller products stay hidden until an
          administrator approves them.
        </p>
      </div>

      {state?.success && (
        <p className="text-sm font-medium text-green-600">Catalog setting saved.</p>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} size="sm">
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Catalog Setting'
        )}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications — platform-wide announcement broadcast                */
/* ------------------------------------------------------------------ */

export function AnnouncementForm() {
  const [state, formAction, pending] = useActionState<
    SettingsActionResult | null,
    FormData
  >(sendPlatformAnnouncement, null);

  const delivered = state?.fieldErrors?.delivered;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="announcement_subject" className="text-sm font-medium">
          Subject
        </label>
        <input
          id="announcement_subject"
          name="subject"
          type="text"
          maxLength={120}
          required
          placeholder="e.g. Scheduled maintenance this weekend"
          className={inputClass}
        />
        <FieldError message={state?.fieldErrors?.subject} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="announcement_message" className="text-sm font-medium">
          Message
        </label>
        <textarea
          id="announcement_message"
          name="message"
          maxLength={1000}
          required
          rows={4}
          placeholder="Keep it short and useful — this is delivered in-app to every active user."
          className={`${inputClass} resize-y`}
        />
        <FieldError message={state?.fieldErrors?.message} />
      </div>

      {state?.success && delivered !== undefined && (
        <p className="text-sm font-medium text-green-600">
          Announcement delivered to {delivered} user{delivered === '1' ? '' : 's'}.
        </p>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} size="sm" variant="outline">
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Announcement'
        )}
      </Button>
    </form>
  );
}
