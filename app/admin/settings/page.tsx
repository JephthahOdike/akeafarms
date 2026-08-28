import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Bell, Truck, CreditCard, Tag } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/helpers';
import { ProfileForm, AvatarUpload } from '@/components/settings/profile-form';
import { DeactivateForm } from '@/components/settings/deactivate-form';
import { EmployeeManager } from '@/components/settings/employee-manager';
import { getEmployees, getNotificationPreferences } from '@/lib/settings/actions';
import { NotificationForm } from '@/components/settings/notification-form';

export const metadata = { title: 'Settings' };

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();

  if (!user) return null;

  const employees = await getEmployees();
  const notificationPrefs = await getNotificationPreferences();

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
            <CreditCard className="size-5" /> Payments
          </CardTitle>
          <CardDescription>
            Paystack and settlement configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Payment processing is configured via environment variables and the Paystack dashboard.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-5" /> Shipping
          </CardTitle>
          <CardDescription>
            Shipping rates, zones, and delivery configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Phase 7 — coming in a future update.
          </p>
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
        <CardContent>
          <NotificationForm initialPreferences={notificationPrefs} />
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
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Manage categories from the Categories admin page.
          </p>
        </CardContent>
      </Card>

      <DeactivateForm />
    </div>
  );
}
