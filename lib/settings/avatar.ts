/**
 * Akea Farms — Avatar Upload Utility
 *
 * Uses Sharp for optimization, reuses multi-bucket architecture.
 * Avatars: max 256px, WebP, stripped metadata.
 */

import 'server-only';
import sharp from 'sharp';
import { createServiceClient } from '@/lib/supabase/service';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB input limit
const AVATAR_SIZE = 256;           // resize to 256x256
const BUCKET = 'avatars';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  // Validate
  if (file.size === 0) {
    return { error: 'File is empty.' };
  }

  if (file.size > MAX_SIZE) {
    return { error: 'Image must be under 5 MB.' };
  }

  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Only JPEG, PNG, WebP, and AVIF images are allowed.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // Optimize: crop square, resize, convert to WebP, strip metadata
    const optimized = await sharp(rawBuffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const supabase = createServiceClient();
    const path = `${userId}/avatar.webp`;

    // Upload (upsert — replace existing)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, optimized, {
        contentType: 'image/webp',
        upsert: true
      });

    if (error) {
      console.error('[avatar] Upload error:', error.message);
      return { error: 'Failed to upload avatar.' };
    }

    const { data: publicUrl } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    // Update profile with avatar URL
    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl.publicUrl })
      .eq('id', userId);

    return { url: publicUrl.publicUrl };
  } catch (e: any) {
    console.error('[avatar] Processing error:', e);
    return { error: 'Failed to process image.' };
  }
}

export async function deleteAvatar(userId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([`${userId}/avatar.webp`]);

  if (error) {
    console.error('[avatar] Delete error:', error.message);
    return false;
  }

  await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);

  return true;
}
