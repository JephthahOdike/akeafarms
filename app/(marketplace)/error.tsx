'use client';

import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MarketsError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <AlertTriangle className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Could not load this page</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset} variant="outline">
            <RefreshCw className="mr-1 size-4" />
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link href="/products">
              <ArrowLeft className="mr-1 size-4" />
              Browse products
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
