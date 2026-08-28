import { Mail, Phone, MessageCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Support' };

const CONTACT = {
  email: 'help.akeafarms@gmail.com',
  phone: '08029965942',
  whatsapp: '08100217845'
};

export default function AdminSupportPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Support & Operations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contact information and support resources for buyers, sellers, and staff.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <Mail className="size-5 text-primary mb-2" />
            <CardTitle className="text-lg">Email Support</CardTitle>
            <CardDescription>Primary support channel</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`mailto:${CONTACT.email}`}
              className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              {CONTACT.email} <ExternalLink className="size-3" />
            </a>
            <p className="text-xs text-muted-foreground mt-2">
              Typically responds within 24 hours. For urgent issues, please use WhatsApp or phone.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Phone className="size-5 text-primary mb-2" />
            <CardTitle className="text-lg">Phone</CardTitle>
            <CardDescription>Direct line</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`tel:+234${CONTACT.phone}`}
              className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              {CONTACT.phone} <ExternalLink className="size-3" />
            </a>
            <p className="text-xs text-muted-foreground mt-2">
              Available during business hours (Mon-Fri, 8 AM - 6 PM WAT).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <MessageCircle className="size-5 text-primary mb-2" />
            <CardTitle className="text-lg">WhatsApp</CardTitle>
            <CardDescription>Quick messaging</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`https://wa.me/234${CONTACT.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              {CONTACT.whatsapp} <ExternalLink className="size-3" />
            </a>
            <p className="text-xs text-muted-foreground mt-2">
              Best for quick questions, order issues, and urgent seller/buyer support.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Common Support Tasks</CardTitle>
          <CardDescription>Quick reference for the support team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="font-medium">Buyer Issues</p>
              <p className="text-muted-foreground mt-1">
                Order not received, payment confirmed but order stuck, product quality complaints,
                refund requests — direct buyers to email or WhatsApp with their order number.
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="font-medium">Seller Issues</p>
              <p className="text-muted-foreground mt-1">
                Account approval status, settlement delays, product listing problems,
                order management questions — review in admin panel first, escalate via email if needed.
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="font-medium">Technical Issues</p>
              <p className="text-muted-foreground mt-1">
                Payment failures, checkout errors, image upload problems, account access issues —
                check server logs and Paystack dashboard before escalating.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
