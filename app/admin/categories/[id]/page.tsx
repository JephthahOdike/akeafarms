import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/helpers';
import { CategoryForm } from '@/components/admin/category-form';

export const metadata = { title: 'Edit Category' };

export default async function EditCategoryPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('products.manage');
  const { id } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, description, parent_id, sort_order, is_active')
    .eq('id', id)
    .single();

  if (!category) notFound();

  const { data: parents } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Edit Category</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{category.name}</p>
      <CategoryForm
        category={category}
        parents={(parents ?? []).map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
