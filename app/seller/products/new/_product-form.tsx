'use client';

import { useActionState, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createProductAction, type ProductFormState } from './actions';

interface Category {
  id: string;
  name: string;
}

export default function ProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    createProductAction,
    {}
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect to product page after creation
  if (state.ok && state.productId) {
    router.push(`/seller/products`);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 8) {
      alert('Maximum 8 images per product.');
      return;
    }

    const validFiles = files.filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(f.type)
    );
    if (validFiles.length !== files.length) {
      alert('Only JPEG, PNG, WebP and AVIF images are supported.');
      return;
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [
      ...prev,
      ...validFiles.map((f) => URL.createObjectURL(f))
    ]);
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);

    const formEl = e.currentTarget;

    // Step 1: Create the product (save as draft first)
    const formData = new FormData(formEl);
    formData.set('draft', 'true');
    const pendingResult = await createProductAction({}, formData);

    if (!pendingResult.ok || !pendingResult.productId) {
      setUploading(false);
      return;
    }

    // Step 2: Upload images
    if (selectedFiles.length > 0) {
      const uploadForm = new FormData();
      uploadForm.set('productId', pendingResult.productId);
      selectedFiles.forEach((f) => uploadForm.append('files', f));

      const res = await fetch('/api/upload/product-images', {
        method: 'POST',
        body: uploadForm
      });

      if (!res.ok) {
        alert('Some images failed to upload. You can add them later.');
      }
    }

    // Step 3: Submit final form with images uploaded
    const finalForm = new FormData(formEl);
    finalForm.set('draft', 'false');
    finalForm.set('productId', pendingResult.productId);
    await createProductAction({}, finalForm);

    setUploading(false);
    formEl.reset();
    router.push('/seller/products');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>
            Fill in the information about your agricultural product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.error && !state.fieldErrors && (
            <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g. Organic Red Tomatoes"
            />
            {state.fieldErrors?.name && (
              <p className="mt-1 text-xs text-destructive">{state.fieldErrors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe your product..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="category_id">Category *</Label>
              <select
                id="category_id"
                name="category_id"
                required
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="price">Price (NGN) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                required
                placeholder="0.00"
              />
              {state.fieldErrors?.price && (
                <p className="mt-1 text-xs text-destructive">{state.fieldErrors.price}</p>
              )}
            </div>
            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                name="unit"
                required
                placeholder="e.g. kg, basket, bag"
              />
            </div>
            <div>
              <Label htmlFor="compare_at_price">Compare at Price (NGN)</Label>
              <Input
                id="compare_at_price"
                name="compare_at_price"
                type="number"
                step="0.01"
                placeholder="Original price"
              />
            </div>
            <div>
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="weight_kg">Weight (kg)</Label>
              <Input
                id="weight_kg"
                name="weight_kg"
                type="number"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="quality_grade">Quality Grade</Label>
              <Input
                id="quality_grade"
                name="quality_grade"
                placeholder="e.g. A, Premium"
              />
            </div>
            <div>
              <Label htmlFor="packaging_info">Packaging</Label>
              <Input
                id="packaging_info"
                name="packaging_info"
                placeholder="e.g. Vacuum sealed"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="organic"
              name="organic"
              className="size-4 rounded border-border"
            />
            <Label htmlFor="organic" className="text-sm font-normal">
              This product is organically grown
            </Label>
          </div>

          {/* Image Upload */}
          <div>
            <Label>Product Images</Label>
            <div className="mt-2 rounded-xl border-2 border-dashed border-border p-8 text-center">
              <Upload className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drag & drop or click to upload (max 8 images, 5 MB each)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Images
              </Button>
            </div>

            {previews.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {previews.map((url, i) => (
                  <div key={i} className="relative size-20 overflow-hidden rounded-lg border border-border">
                    <img
                      src={url}
                      alt={`Preview ${i + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={pending || uploading}>
              {(pending || uploading) && (
                <Loader2 className="mr-1 size-4 animate-spin" />
              )}
              Save Product
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
