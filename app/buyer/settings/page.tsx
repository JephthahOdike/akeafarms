import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, HelpCircle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/helpers';
import { ProfileForm, AvatarUpload } from '@/components/settings/profile-form';
import { PasswordForm } from '@/components/settings/password-form';
import { EmailForm } from '@/components/settings/email-form';
import { NotificationForm } from '@/components/settings/notification-form';
import { getNotificationPreferences } from '@/lib/settings/actions';
import { DeactivateForm } from '@/components/settings/deactivate-form';

export const metadata = { title: 'Settings' };

export default async function BuyerSettingsPage() {
  const user = await getCurrentUser();

  if (!user) return null;

  const notificationPrefs = await getNotificationPreferences();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, security, and preferences.
        </p>
      </div>

      <AvatarUpload profile={user.profile} />
      <ProfileForm profile={user.profile} />
      <PasswordForm />
      <EmailForm />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" /> Notifications
          </CardTitle>
          <CardDescription>
            Choose what emails you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationForm initialPreferences={notificationPrefs} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="size-5" /> Help & Support
          </CardTitle>
          <CardDescription>
            Need assistance? Contact our support team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Email:{' '}
            <a href="mailto:help.akeafarms@gmail.com" className="text-primary hover:underline">
              help.akeafarms@gmail.com
            </a>
          </p>
          <p>
            Phone:{' '}
            <a href="tel:+23408029965942" className="text-primary hover:underline">
              08029965942
            </a>
          </p>
          <p>
            WhatsApp:{' '}
            <a
              href="https://wa.me/23408100217845"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              08100217845
            </a>
          </p>
        </CardContent>
      </Card>

      <DeactivateForm />
    </div>
  );
}
