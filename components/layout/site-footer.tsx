import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Leaf, ShieldCheck, Truck } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Marketplace',
    links: [
      { href: '/products', label: 'All products' },
      { href: '/categories', label: 'Categories' },
      { href: '/stores', label: 'Stores' },
      { href: '/deals', label: 'Deals' }
    ]
  },
  {
    title: 'Sell on Akea Farms',
    links: [
      { href: '/register?role=seller', label: 'Become a seller' },
      { href: '/seller', label: 'Seller dashboard' },
      { href: '/seller/fees', label: 'Fees & commission' },
      { href: '/help/seller', label: 'Seller help' }
    ]
  },
  {
    title: 'Support',
    links: [
      { href: '/help', label: 'Help centre' },
      { href: '/contact', label: 'Contact us' },
      { href: '/shipping', label: 'Shipping & returns' },
      { href: '/track', label: 'Track order' }
    ]
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/blog', label: 'Blog' },
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2 space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-xs">
              Nigeria&apos;s agricultural marketplace — direct from verified
              farms, distributors and agro-businesses.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Leaf className="size-4 text-primary" /> Farm-fresh produce
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" /> Verified sellers
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Truck className="size-4 text-primary" /> Nationwide delivery
              </li>
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">
                {col.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row">
          <p>
            © {new Date().getFullYear()} Akea Farms. All rights reserved.
          </p>
          <p>Made with care for Nigerian agriculture.</p>
        </div>
      </div>
    </footer>
  );
}
