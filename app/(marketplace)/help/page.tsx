import Link from 'next/link';
import { HelpCircle, Book, MessageCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Help Center' };

const ARTICLES = [
  { title: 'Getting Started', desc: 'Learn how to navigate the marketplace', icon: Book },
  { title: 'Placing an Order', desc: 'How to browse, add to cart, and checkout', icon: FileText },
  { title: 'Payment Methods', desc: 'Accepted payment options and Paystack guide', icon: HelpCircle },
  { title: 'Tracking Orders', desc: 'How to track your delivery', icon: HelpCircle },
  { title: 'Returns & Refunds', desc: 'Our return policy and refund process', icon: MessageCircle },
  { title: 'Seller FAQ', desc: 'Information for farmers and sellers', icon: Book }
];

export default function HelpPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
          <p className="mt-2 text-muted-foreground">Find answers to common questions about Akea Farms.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map((a) => (
            <Card key={a.title} className="hover:border-primary/30 transition-colors">
              <CardHeader>
                <a.icon className="size-6 text-primary" />
                <CardTitle className="text-base">{a.title}</CardTitle>
                <CardDescription>{a.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">Can't find what you need?</p>
          <Link href="/contact" className="mt-2 inline-block text-primary hover:underline">Contact Support</Link>
        </div>
      </div>
    </div>
  );
}
