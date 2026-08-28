'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="mx-auto max-w-md text-center">
          <AlertTriangle className="mx-auto size-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-2 text-muted-foreground">
            An unexpected error occurred. Our team has been notified.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={reset} variant="outline">
              <RefreshCw className="mr-1 size-4" />
              Try again
            </Button>
            <Button asChild>
              <Link href="/">
                <Home className="mr-1 size-4" />
                Go home
              </Link>
            </Button>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Need help? Contact{' '}
            <a
              href="mailto:help.akeafarms@gmail.com"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Mail className="size-3" />
              help.akeafarms@gmail.com
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
