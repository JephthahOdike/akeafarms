import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Contact Us' };

export default function ContactPage() {
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
              <p className="text-sm text-muted-foreground">help.akeafarms@gmail.com</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Phone className="mx-auto size-8 text-primary" />
              <h3 className="mt-3 font-semibold">Phone</h3>
              <p className="text-sm text-muted-foreground">08029965942</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <MessageCircle className="mx-auto size-8 text-primary" />
              <h3 className="mt-3 font-semibold">WhatsApp</h3>
              <p className="text-sm text-muted-foreground">08100217845</p>
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
            <CardDescription>We'll get back to you within 24 hours.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="name">Name</Label><Input id="name" placeholder="Your name" /></div>
              <div><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="you@example.com" /></div>
            </div>
            <div><Label htmlFor="subject">Subject</Label><Input id="subject" placeholder="How can we help?" /></div>
            <div><Label htmlFor="message">Message</Label><textarea id="message" rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Your message..." /></div>
            <Button className="w-full">Send Message</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
