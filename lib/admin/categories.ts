'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRole } from '@/lib/auth/helpers';
import { logAudit } from '@/lib/audit';
import { slugify } from '@/lib/utils';

export type CategoryActionResult = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().max(500).optional().or(z.literal('')),
  parent_id: z.string().optional().or(z.literal('')),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional()
});

async function uniqueSlug(
  service: ReturnType<typeof createServiceClient>,
  base: string,
  excludeId?: string
): Promise<string> {
  let candidate = base || 'category';
  let i = 1;
  while (i < 50) {
    let query = service.from('categories').select('id').eq('slug', candidate);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    i += 1;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export async function createCategory(
  _prev: CategoryActionResult | null,
  formData: FormData
): Promise<CategoryActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  raw.is_active = formData.get('is_active') === 'on';

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Please fix the highlighted fields.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((e) => [e.path.join('.'), e.message])
      )
    };
  }

  const { name, description, parent_id, sort_order, is_active } = parsed.data;
  const slug = await uniqueSlug(service, slugify(name));

  const { error } = await service.from('categories').insert({
    name,
    slug,
    description: description || null,
    parent_id: parent_id || null,
    sort_order: sort_order ?? 0,
    is_active: is_active ?? true
  });

  if (error) {
    console.error('[admin] Category create error:', error.message);
    return { error: 'Failed to create category.' };
  }

  await logAudit({
    user_id: admin.id,
    action: 'category_created',
    resource: 'categories',
    metadata: { name, slug }
  });

  revalidatePath('/admin/categories');
  return { success: true };
}

export async function updateCategory(
  categoryId: string,
  _prev: CategoryActionResult | null,
  formData: FormData
): Promise<CategoryActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  raw.is_active = formData.get('is_active') === 'on';

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Please fix the highlighted fields.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((e) => [e.path.join('.'), e.message])
      )
    };
  }

  const { name, description, parent_id, sort_order, is_active } = parsed.data;
  const slug = await uniqueSlug(service, slugify(name), categoryId);

  const { error } = await service
    .from('categories')
    .update({
      name,
      slug,
      description: description || null,
      parent_id: parent_id || null,
      sort_order: sort_order ?? 0,
      is_active: is_active ?? false
    })
    .eq('id', categoryId);

  if (error) {
    console.error('[admin] Category update error:', error.message);
    return { error: 'Failed to update category.' };
  }

  await logAudit({
    user_id: admin.id,
    action: 'category_updated',
    resource: 'categories',
    resource_id: categoryId,
    metadata: { name, slug }
  });

  revalidatePath('/admin/categories');
  return { success: true };
}

export async function deleteCategory(
  categoryId: string
): Promise<CategoryActionResult> {
  const admin = await requireRole('admin');
  const service = createServiceClient();

  const { error } = await service
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    console.error('[admin] Category delete error:', error.message);
    return { error: 'Failed to delete category.' };
  }

  await logAudit({
    user_id: admin.id,
    action: 'category_deleted',
    resource: 'categories',
    resource_id: categoryId
  });

  revalidatePath('/admin/categories');
  return { success: true };
}
