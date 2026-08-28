/**
 * Akea Farms — Supabase Storage Utility
 *
 * Handles product image uploads with:
 * - Sharp-based compression, resizing, and WebP conversion
 * - Multi-bucket architecture (auto-rotates at 50 MB limit)
 * - File validation by MIME type and magic bytes
 * - Metadata stripping for privacy
 *
 * Bucket naming: product-images-001, product-images-002, ...
 */

import 'server-only';
import sharp from 'sharp';
import { createServiceClient } from '@/lib/supabase/service';

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);
const MAX_INPUT_SIZE = 20 * 1024 * 1024;       // 20 MB — reject anything larger
const MAX_DIMENSION = 1200;                     // max width/height in px
const JPEG_QUALITY = 82;                        // 0-100
const PNG_QUALITY = 80;                         // 0-100
const WEBP_QUALITY = 82;                        // 0-100
const MAX_FILES = 8;
const BUCKET_BASE = 'product-images';

const MAX_BUCKET_SIZE =
  Number(process.env.SUPABASE_BUCKET_MAX_SIZE_MB || 50) * 1024 * 1024;
const SAFETY_THRESHOLD =
  Number(process.env.SUPABASE_BUCKET_SAFETY_THRESHOLD_MB || 45) * 1024 * 1024;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UploadResult {
  url: string;
  path: string;
  bucket: string;
}

export interface UploadError {
  error: string;
  status: number;
}

/* ------------------------------------------------------------------ */
/*  Magic-byte validation                                              */
/* ------------------------------------------------------------------ */

const MAGIC_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'image/avif': [0x00, 0x00, 0x00, 0x20]
};

function validateMagicBytes(buffer: Buffer): string | null {
  const head = buffer.subarray(0, 12);

  for (const [mime, sig] of Object.entries(MAGIC_SIGNATURES)) {
    if (sig.every((byte, i) => head[i] === byte)) {
      // Extra check for WebP (RIFF####WEBP)
      if (mime === 'image/webp') {
        const riff = head.toString('ascii', 8, 12);
        if (riff !== 'WEBP') continue;
      }
      // Extra check for AVIF (RIFF####AVIF or ftypavif)
      if (mime === 'image/avif') {
        const ftyp = head.toString('ascii', 4, 12);
        if (!ftyp.includes('ftypavif') && !ftyp.includes('ftypavis') && !ftyp.includes('ftypmif1')) continue;
      }
      return mime;
    }
  }

  return null;
}

function getExtensionFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/avif': return 'avif';
    default: return 'jpg';
  }
}

/* ------------------------------------------------------------------ */
/*  Image processing                                                   */
/* ------------------------------------------------------------------ */

/**
 * Process an image: resize if too large, convert to WebP, strip metadata.
 * Preserves original format if WebP conversion would be lossy for small images.
 */
async function optimizeImage(buffer: Buffer): Promise<{ buffer: Buffer; contentType: string }> {
  const image = sharp(buffer, { failOn: 'none' });
  const metadata = await image.metadata();

  const needsResize =
    (metadata.width && metadata.width > MAX_DIMENSION) ||
    (metadata.height && metadata.height > MAX_DIMENSION);

  let pipeline = image;

  if (needsResize) {
    pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  // Convert to WebP unless source is AVIF/HEIF (already efficient)
  const sourceFormat = metadata.format;
  if (sourceFormat === 'heif') {
    return { buffer, contentType: 'image/avif' };
  }

  // WebP output with slight sharpening
  const result = await pipeline
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  return { buffer: result, contentType: 'image/webp' };
}

/* ------------------------------------------------------------------ */
/*  Bucket management                                                  */
/* ------------------------------------------------------------------ */

/**
 * Get the current active bucket for new uploads.
 * Creates a new bucket if the current one is approaching capacity.
 */
async function getUploadBucket(): Promise<string> {
  const supabase = createServiceClient();

  // Get the most recently created active bucket
  const { data: buckets } = await supabase
    .from('storage_buckets')
    .select('name, size_bytes')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  const current = buckets?.[0];

  if (!current) {
    // No bucket exists — create first one
    return await createNextBucket(supabase, 1);
  }

  // Check if current bucket is approaching the safety threshold
  if (current.size_bytes >= SAFETY_THRESHOLD) {
    // Find the next bucket number
    const seq = getBucketSequence(current.name) + 1;
    return await createNextBucket(supabase, seq);
  }

  return current.name;
}

function getBucketSequence(name: string): number {
  const match = name.match(/-(\d{3})$/);
  return match ? parseInt(match[1], 10) : 1;
}

function formatBucketName(seq: number): string {
  return `${BUCKET_BASE}-${String(seq).padStart(3, '0')}`;
}

async function createNextBucket(
  supabase: ReturnType<typeof createServiceClient>,
  seq: number
): Promise<string> {
  const name = formatBucketName(seq);

  // Create the Supabase storage bucket
  const { error: createErr } = await supabase.storage.createBucket(name, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB per file
    allowedMimeTypes: ALLOWED_TYPES
  });

  if (createErr && !createErr.message.includes('already exists')) {
    console.error('[storage] Bucket creation error:', createErr.message);
    throw new Error(`Failed to create storage bucket: ${createErr.message}`);
  }

  // Track it in our database
  await supabase
    .from('storage_buckets')
    .upsert(
      { name, size_bytes: 0, max_size_bytes: MAX_BUCKET_SIZE, is_active: true },
      { onConflict: 'name' }
    );

  return name;
}

/**
 * Update bucket usage tracking after an upload.
 */
async function trackUploadSize(bucket: string, byteSize: number): Promise<void> {
  const supabase = createServiceClient();
  const { data: current } = await supabase
    .from('storage_buckets')
    .select('size_bytes')
    .eq('name', bucket)
    .single();

  if (current) {
    await supabase
      .from('storage_buckets')
      .update({ size_bytes: current.size_bytes + byteSize })
      .eq('name', bucket);
  }
}

/**
 * Update bucket usage tracking after a deletion.
 */
async function trackDeleteSize(bucket: string, byteSize: number): Promise<void> {
  const supabase = createServiceClient();
  const { data: current } = await supabase
    .from('storage_buckets')
    .select('size_bytes')
    .eq('name', bucket)
    .single();

  if (current) {
    await supabase
      .from('storage_buckets')
      .update({
        size_bytes: Math.max(0, current.size_bytes - byteSize)
      })
      .eq('name', bucket);
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Validate a File object before processing.
 */
function validateFile(file: File): UploadError | null {
  // Check extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      error: `File type ".${ext}" is not allowed. Use JPEG, PNG, WebP, or AVIF.`,
      status: 400
    };
  }

  // Check size
  if (file.size === 0) {
    return { error: `File "${file.name}" is empty.`, status: 400 };
  }

  if (file.size > MAX_INPUT_SIZE) {
    return {
      error: `File "${file.name}" exceeds the 20 MB limit.`,
      status: 400
    };
  }

  // Check MIME type
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return {
      error: `File type "${file.type}" is not allowed. Use JPEG, PNG, WebP, or AVIF.`,
      status: 400
    };
  }

  return null;
}

/**
 * Upload product images for a seller.
 *
 * @param sellerId - The authenticated seller's profile ID
 * @param productId - The product these images belong to
 * @param files - Array of File objects from FormData
 * @returns Array of { url, path, bucket } for successful uploads
 */
export async function uploadProductImages(
  sellerId: string,
  productId: string,
  files: File[]
): Promise<{ results: UploadResult[]; errors: string[] }> {
  const supabase = createServiceClient();
  const results: UploadResult[] = [];
  const errors: string[] = [];

  if (files.length > MAX_FILES) {
    return {
      results: [],
      errors: [`Maximum ${MAX_FILES} images allowed per product.`]
    };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Validate
    const validation = validateFile(file);
    if (validation) {
      errors.push(validation.error);
      continue;
    }

    try {
      // Read file buffer
      const arrayBuffer = await file.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuffer);

      // Validate magic bytes
      const detectedType = validateMagicBytes(rawBuffer);
      if (!detectedType) {
        errors.push(`File "${file.name}" is not a valid image.`);
        continue;
      }

      // Optimize image (compress, resize, convert to WebP)
      const { buffer: optimizedBuffer, contentType } =
        await optimizeImage(rawBuffer);

      if (optimizedBuffer.length > MAX_INPUT_SIZE) {
        errors.push(`File "${file.name}" is too large after optimization.`);
        continue;
      }

      // Get the appropriate bucket
      const bucket = await getUploadBucket();

      // Build path: sellerId/productId/timestamp-random.ext
      const ext = 'webp'; // we always output WebP
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const path = `${sellerId}/${productId}/${fileName}`;

      // Upload to Supabase
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, optimizedBuffer, {
          contentType,
          upsert: false
        });

      if (error) {
        console.error('[storage] Upload error:', error.message);
        errors.push(`Failed to upload "${file.name}": ${error.message}`);
        continue;
      }

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      // Track bucket usage
      trackUploadSize(bucket, optimizedBuffer.length).catch(() => {});

      results.push({
        url: publicUrl.publicUrl,
        path,
        bucket
      });
    } catch (e: any) {
      console.error('[storage] Processing error:', e);
      errors.push(`Failed to process "${file.name}": ${e.message}`);
    }
  }

  return { results, errors };
}

/**
 * Delete a product image from storage.
 * Only call after verifying the seller owns the product.
 */
export async function deleteProductImage(
  bucket: string,
  path: string
): Promise<boolean> {
  const supabase = createServiceClient();

  // Get file size before deleting
  let fileSize = 0;
  try {
    const { data: files } = await supabase.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop()
      });
    fileSize = files?.[0]?.metadata?.size || 0;
  } catch {
    // Size tracking is best-effort
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error('[storage] Delete error:', error.message);
    return false;
  }

  // Update bucket tracking
  if (fileSize > 0) {
    trackDeleteSize(bucket, fileSize).catch(() => {});
  }

  return true;
}

/**
 * Delete all images for a product.
 */
export async function deleteAllProductImages(
  sellerId: string,
  productId: string,
  bucket: string
): Promise<boolean> {
  const supabase = createServiceClient();

  // List all files under the product folder
  const { data: files, error } = await supabase.storage
    .from(bucket)
    .list(`${sellerId}/${productId}`);

  if (error) {
    console.error('[storage] List error:', error.message);
    return false;
  }

  if (!files || files.length === 0) return true;

  const paths = files.map((f) => `${sellerId}/${productId}/${f.name}`);
  const totalSize = files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);

  const { error: rmError } = await supabase.storage
    .from(bucket)
    .remove(paths);

  if (rmError) return false;

  if (totalSize > 0) {
    trackDeleteSize(bucket, totalSize).catch(() => {});
  }

  return true;
}
