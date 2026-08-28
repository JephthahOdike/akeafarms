'use client';

import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SellerError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <AlertTriangle className="mx-auto size-10 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Seller dashboard error</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred loading the seller dashboard.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset} variant="outline">
            <RefreshCw className="mr-1 size-4" />
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link href="/seller">
              <ArrowLeft className="mr-1 size-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
