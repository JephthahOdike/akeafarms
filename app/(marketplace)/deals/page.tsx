import Link from 'next/link';
import { Tag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Deals' };

export default function DealsPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Special Deals</h1>
          <p className="mt-2 text-muted-foreground">Discounted agricultural products and seasonal offers.</p>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
          <Tag className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No active deals</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Check back soon for special offers on fresh produce, grains, and more.
          </p>
          <Button asChild className="mt-4">
            <Link href="/products">Browse all products</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
