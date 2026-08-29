import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Bell, Truck, CreditCard, Tag, Mail, Megaphone, Info } from 'lucide-react';
import { requireRole } from '@/lib/auth/helpers';
import { ProfileForm, AvatarUpload } from '@/components/settings/profile-form';
import { DeactivateForm } from '@/components/settings/deactivate-form';
import { EmployeeManager } from '@/components/settings/employee-manager';
import { getEmployees, getNotificationPreferences } from '@/lib/settings/actions';
import { NotificationForm } from '@/components/settings/notification-form';
import {
  SupportContactForm,
  ShippingFeeForm,
  CatalogAutoApproveForm,
  AnnouncementForm
} from '@/components/settings/platform-forms';
import { getPlatformSettings } from '@/lib/settings/platform';

export const metadata = { title: 'Settings' };

export default async function AdminSettingsPage() {
  // Admin-only: employee permission management must never be reachable by
  // employees themselves (proxy allows employees across /admin).
  const user = await requireRole('admin');

  const employees = await getEmployees();
  const notificationPrefs = await getNotificationPreferences();
  const settings = await getPlatformSettings();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administrator settings for Akea Farms.
        </p>
      </div>

      <AvatarUpload profile={user.profile} />
      <ProfileForm profile={user.profile} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" /> Employee Permissions
          </CardTitle>
          <CardDescription>
            Manage staff access. Upgrade users to employees and assign granular permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeManager employees={employees} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5" /> General — Support Contact
          </CardTitle>
          <CardDescription>
            Shown on the public contact page and in the support queues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupportContactForm
            supportEmail={settings.supportEmail}
            supportPhone={settings.supportPhone}
            supportWhatsapp={settings.supportWhatsapp}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" /> Payments
          </CardTitle>
          <CardDescription>
            Paystack and settlement configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Payment processing is configured via environment variables and the Paystack dashboard.
          </p>
          <Link
            href="/admin/settlements"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Platform commission &amp; seller settlements
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-5" /> Shipping
          </CardTitle>
          <CardDescription>
            Delivery fee applied at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShippingFeeForm fee={String(settings.shippingFlatFee)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" /> Notifications
          </CardTitle>
          <CardDescription>
            Choose which in-app notifications and emails you receive. Security
            and account notifications are always delivered.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <NotificationForm initialPreferences={notificationPrefs} />
          <div className="border-t border-border pt-6">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Megaphone className="size-4" /> Broadcast Announcement
            </p>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Sends an in-app notification to every active user. Use sparingly.
            </p>
            <AnnouncementForm />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-5" /> Catalog
          </CardTitle>
          <CardDescription>
            Product catalog defaults and category management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <CatalogAutoApproveForm autoApprove={settings.catalogAutoApproveProducts} />
          <Link
            href="/admin/categories"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Manage categories
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-2 pt-6">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Secret credentials (Paystack keys, Brevo API key) are never stored
            or displayed here — they live exclusively in encrypted environment
            variables on the server.
          </p>
        </CardContent>
      </Card>

      <DeactivateForm />
    </div>
  );
}
