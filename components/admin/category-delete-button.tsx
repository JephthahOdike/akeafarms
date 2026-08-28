'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteCategory } from '@/lib/admin/categories';

export function CategoryDeleteButton({ categoryId }: { categoryId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm('Delete this category?')) return;
    setPending(true);
    setError(null);
    const res = await deleteCategory(categoryId);
    setPending(false);
    if (res?.error) setError(res.error);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
        aria-label="Delete category"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
