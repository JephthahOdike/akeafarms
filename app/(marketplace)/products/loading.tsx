import { Loader2 } from 'lucide-react';

export default function ProductsLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading products...</p>
      </div>
    </div>
  );
}
