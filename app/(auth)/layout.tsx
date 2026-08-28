import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export default function AuthLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 to-background">
      <header className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground hidden sm:inline">
            Need help?
          </span>
          <Link
            href="/contact"
            className="font-medium text-foreground hover:underline"
          >
            Contact us
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
