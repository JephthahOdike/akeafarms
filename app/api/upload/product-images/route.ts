import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadProductImages } from '@/lib/storage';

/**
 * POST /api/upload/product-images
 *
 * Accepts multipart/form-data with:
 * - productId: string (must belong to authenticated seller)
 * - files: File[] (up to 8 images)
 *
 * Returns uploaded image URLs and any errors.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get seller profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, seller_profiles!inner(id)')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'seller') {
      return NextResponse.json(
        { error: 'Only sellers can upload product images' },
        { status: 403 }
      );
    }

    const sellerArr = profile.seller_profiles as unknown as { id: string }[];
    const sellerId = sellerArr?.[0]?.id;
    if (!sellerId) {
      return NextResponse.json(
        { error: 'Seller profile not found' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const productId = formData.get('productId') as string;
    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    // Verify product belongs to seller
    const { data: product } = await supabase
      .from('products')
      .select('id, store_id, stores!inner(seller_id)')
      .eq('id', productId)
      .single();

    const storeArr = product?.stores as unknown as { seller_id: string }[];
    if (!product || storeArr?.[0]?.seller_id !== sellerId) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // Collect files
    const files: File[] = [];
    for (const [, value] of formData.entries()) {
      if (value instanceof File && value.size > 0) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No valid files provided' },
        { status: 400 }
      );
    }

    // Upload
    const { results, errors } = await uploadProductImages(
      sellerId,
      productId,
      files
    );

    // Save image records to database
    if (results.length > 0) {
      const imageRecords = results.map((img) => ({
        product_id: productId,
        url: img.url,
        alt_text: '',
        is_primary: false,
        bucket: img.bucket
      }));

      await supabase.from('product_images').insert(imageRecords);
    }

    return NextResponse.json({ results, errors });
  } catch (e) {
    console.error('[upload] Error:', e);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
