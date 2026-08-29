'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getPlatformSettings } from '@/lib/settings/platform';
import { slugify } from '@/lib/utils';

const productSchema = z.object({
  name: z.string().min(2, 'Product name is required').max(200),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive('Price must be positive'),
  compare_at_price: z.coerce.number().positive().optional(),
  unit: z.string().min(1, 'Unit is required').max(50),
  weight_kg: z.coerce.number().positive().optional(),
  quality_grade: z.string().max(10).optional(),
  organic: z.coerce.boolean().optional(),
  packaging_info: z.string().max(200).optional(),
  category_id: z.string().uuid('Category is required'),
  stock: z.coerce.number().int().min(0).optional()
});

export type ProductFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  productId?: string;
};

export async function createProductAction(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  // Get seller profile and store
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, seller_profiles!inner(id)')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'seller') {
    return { error: 'Only sellers can create products.' };
  }

  const sellerArr = profile.seller_profiles as { id: string }[];
  const sellerId = sellerArr?.[0]?.id;
  if (!sellerId) return { error: 'Seller profile not found.' };

  // Get the seller's store
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('seller_id', sellerId)
    .single();

  if (!store) return { error: 'You need a store before adding products.' };

  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    price: formData.get('price'),
    compare_at_price: formData.get('compare_at_price') || undefined,
    unit: formData.get('unit'),
    weight_kg: formData.get('weight_kg') || undefined,
    quality_grade: formData.get('quality_grade') || undefined,
    organic: formData.get('organic') === 'on',
    packaging_info: formData.get('packaging_info') || undefined,
    category_id: formData.get('category_id'),
    stock: formData.get('stock') || undefined
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { fieldErrors, error: 'Please fix the highlighted fields.' };
  }

  const data = parsed.data;
  const isDraft = formData.get('draft') === 'true';
  const baseSlug = slugify(data.name);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const service = createServiceClient();

  const { data: product, error } = await service
    .from('products')
    .insert({
      name: data.name,
      slug,
      description: data.description || null,
      price: data.price,
      compare_at_price: data.compare_at_price || null,
      unit: data.unit,
      weight_kg: data.weight_kg || null,
      quality_grade: data.quality_grade || null,
      organic: data.organic ?? false,
      packaging_info: data.packaging_info || null,
      category_id: data.category_id,
      store_id: store.id,
      status: isDraft ? 'draft' : 'active',
      currency: 'NGN'
    })
    .select('id')
    .single();

  if (error || !product) {
    return { error: error?.message || 'Failed to create product.' };
  }

  // Initialize inventory record
  if (data.stock && data.stock > 0) {
    await service.from('inventory').insert({
      product_id: product.id,
      quantity: data.stock
    });
  }

  revalidatePath('/seller/products');
  return { ok: true, productId: product.id };
}
