import Link from 'next/link';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPlatformSettings } from '@/lib/settings/platform';
import { getCurrentUser } from '@/lib/auth/helpers';
import { NewTicketForm } from '@/components/support/new-ticket-form';

import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Contact Us',
  description:
    'Get in touch with the Akea Farms team — support tickets, email, phone and location details.',
  path: '/contact'
});

export default async function ContactPage() {
  // Contact channels are platform configuration (Phase 11 admin settings),
  // not hardcoded marketing copy.
  const settings = await getPlatformSettings();
  const user = await getCurrentUser();

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
          <p className="mt-2 text-muted-foreground">Get in touch with the Akea Farms team.</p>
        </div>

        <div className="grid gap-6 mb-12 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Mail className="mx-auto size-8 text-primary" />
              <h3 className="mt-3 font-semibold">Email</h3>
              <p className="text-sm text-muted-foreground">{settings.supportEmail}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Phone className="mx-auto size-8 text-primary" />
              <h3 className="mt-3 font-semibold">Phone</h3>
              <p className="text-sm text-muted-foreground">{settings.supportPhone}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <MessageCircle className="mx-auto size-8 text-primary" />
              <h3 className="mt-3 font-semibold">WhatsApp</h3>
              <p className="text-sm text-muted-foreground">{settings.supportWhatsapp}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <MapPin className="mx-auto size-8 text-primary" />
              <h3 className="mt-3 font-semibold">Location</h3>
              <p className="text-sm text-muted-foreground">Lagos, Nigeria</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <CardDescription>
              Your message becomes a support ticket — track replies from your account&apos;s
              Support page. We&apos;ll get back to you within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <NewTicketForm
                basePath={
                  user.profile.role === 'seller' ? '/seller/support' : '/buyer/support'
                }
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sign in to open a support ticket so we can track and respond to your
                  request. You can also email us at{' '}
                  <a href={`mailto:${settings.supportEmail}`} className="text-primary hover:underline">
                    {settings.supportEmail}
                  </a>
                  .
                </p>
                <Button asChild>
                  <Link href="/login">Sign in to contact support</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
