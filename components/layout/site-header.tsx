import Link from 'next/link';
import { Search, ShoppingCart } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { UserMenu, NotificationBell } from './user-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentUser } from '@/lib/auth/helpers';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/products', label: 'Browse' },
  { href: '/categories', label: 'Categories' },
  { href: '/stores', label: 'Stores' },
  { href: '/about', label: 'About' }
];

export async function SiteHeader({ className }: { className?: string }) {
  const me = await getCurrentUser();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur',
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo className="shrink-0" />

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-2 font-medium text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <form
          action="/products"
          method="get"
          className="hidden flex-1 md:flex max-w-md mx-2"
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search rice, tomatoes, palm oil…"
              className="pl-9"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative grid size-9 place-items-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
          >
            <ShoppingCart className="size-4" />
          </Link>

          {me ? (
            <>
              <NotificationBell />
              <UserMenu profile={me.profile} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
