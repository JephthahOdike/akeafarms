import { ArrowLeft, Leaf } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ProductForm from './_product-form';

export const metadata = { title: 'Add New Product' };

export default async function SellerNewProductPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/seller/products"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to products
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Add New Product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          List a new product in your store.
        </p>
      </div>

      <ProductForm categories={categories ?? []} />
    </div>
  );
}
