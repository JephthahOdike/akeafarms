'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createCategory,
  updateCategory,
  type CategoryActionResult
} from '@/lib/admin/categories';

type ParentOption = { id: string; name: string };

type CategoryInput = {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

const fieldClass =
  'flex min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

export function CategoryForm({
  category,
  parents
}: {
  category?: CategoryInput;
  parents: ParentOption[];
}) {
  const action = category
    ? updateCategory.bind(null, category.id)
    : createCategory;

  const [state, formAction, pending] = useActionState<
    CategoryActionResult | null,
    FormData
  >(action, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={category?.name ?? ''}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={category?.description ?? ''}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="parent_id">Parent category</Label>
        <select
          id="parent_id"
          name="parent_id"
          defaultValue={category?.parent_id ?? ''}
          className={fieldClass}
        >
          <option value="">None</option>
          {parents
            .filter((p) => p.id !== category?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sort_order">Sort order</Label>
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          min={0}
          defaultValue={category?.sort_order ?? 0}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={category?.is_active ?? true}
          className="size-4 rounded border-input"
        />
        Active
      </label>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600">
          Saved.{' '}
          <Link href="/admin/categories" className="underline">
            Back to categories
          </Link>
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {category ? 'Save changes' : 'Create category'}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/categories">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
