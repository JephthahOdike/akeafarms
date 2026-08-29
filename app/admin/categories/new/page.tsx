import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/helpers';
import { CategoryForm } from '@/components/admin/category-form';

export const metadata = { title: 'Add Category' };

export default async function NewCategoryPage() {
  await requirePermission('products.manage');
  const supabase = await createClient();

  const { data: parents } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Add Category</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Create a new product category.
      </p>
      <CategoryForm
        parents={(parents ?? []).map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
