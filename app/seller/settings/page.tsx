import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Store as StoreIcon, CreditCard } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/helpers';
import { ProfileForm, AvatarUpload } from '@/components/settings/profile-form';
import { PasswordForm } from '@/components/settings/password-form';
import { EmailForm } from '@/components/settings/email-form';
import { SellerBusinessForm } from '@/components/settings/seller-business-form';
import { SellerBankForm } from '@/components/settings/seller-bank-form';
import { NotificationForm } from '@/components/settings/notification-form';
import { getSellerProfile, getNotificationPreferences } from '@/lib/settings/actions';
import { DeactivateForm } from '@/components/settings/deactivate-form';

export const metadata = { title: 'Settings' };

export default async function SellerSettingsPage() {
  const user = await getCurrentUser();

  if (!user) return null;

  const sellerProfile = await getSellerProfile();
  const notificationPrefs = await getNotificationPreferences();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, store, and preferences.
        </p>
      </div>

      <AvatarUpload profile={user.profile} />
      <ProfileForm profile={user.profile} />
      <PasswordForm />
      <EmailForm />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StoreIcon className="size-5" /> Business Profile
          </CardTitle>
          <CardDescription>
            Update your business information visible to customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sellerProfile ? (
            <SellerBusinessForm profile={sellerProfile} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Unable to load seller profile. Please contact support.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" /> Bank & Settlement
          </CardTitle>
          <CardDescription>
            Manage where your earnings are paid out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sellerProfile ? (
            <SellerBankForm profile={sellerProfile} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Unable to load bank details. Please contact support.
            </p>
          )}
        </CardContent>
      </Card>

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

      <DeactivateForm />
    </div>
  );
}
