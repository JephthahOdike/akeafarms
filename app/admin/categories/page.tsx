import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/helpers';
import { Button } from '@/components/ui/button';
import { CategoryDeleteButton } from '@/components/admin/category-delete-button';

export const metadata = { title: 'Categories' };

export default async function AdminCategoriesPage() {
  await requirePermission('products.manage');
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, is_active, sort_order, parent_id')
    .order('sort_order');

  const nameById = new Map(
    (categories ?? []).map((c) => [c.id, c.name as string])
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage product categories.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/categories/new">
            <Plus className="mr-1 size-4" /> Add Category
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Parent</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories?.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-3">{c.sort_order}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.parent_id ? nameById.get(c.parent_id) || '—' : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/admin/categories/${c.id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <CategoryDeleteButton categoryId={c.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
