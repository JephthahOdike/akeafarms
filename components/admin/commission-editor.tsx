'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  setGlobalCommission,
  setSellerCommission,
  setCategoryCommission,
  deleteCommission
} from '@/lib/admin/finance';

type Option = { id: string; name: string };
type Override = { id: string; label: string; percentage: number };

export function CommissionEditor({
  defaultRate,
  sellers,
  categories,
  overrides
}: {
  defaultRate: number | null;
  sellers: Option[];
  categories: Option[];
  overrides: Override[];
}) {
  const [globalPct, setGlobalPct] = useState(defaultRate ?? 15);
  const [sellerId, setSellerId] = useState('');
  const [sellerPct, setSellerPct] = useState(15);
  const [categoryId, setCategoryId] = useState('');
  const [categoryPct, setCategoryPct] = useState(15);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error?: string }>, msg: string) {
    setPending(true);
    setError(null);
    setSuccess(null);
    const res = await fn();
    setPending(false);
    if (res?.error) setError(res.error);
    else setSuccess(msg);
  }

  const inputClass =
    'h-9 w-24 rounded-md border border-input bg-transparent px-2 text-sm';
  const selectClass =
    'h-9 flex-1 rounded-md border border-input bg-transparent px-2 text-sm';

  return (
    <div className="space-y-5">
      {/* Global default */}
      <div className="rounded-lg border border-border p-4">
        <Label className="mb-2 block text-sm font-medium">Platform default</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={globalPct}
            onChange={(e) => setGlobalPct(Number(e.target.value))}
            className="h-9 w-24"
          />
          <span className="text-sm text-muted-foreground">%</span>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => run(() => setGlobalCommission(globalPct), 'Default rate saved.')}
          >
            Save default
          </Button>
        </div>
      </div>

      {/* Seller override */}
      <div className="rounded-lg border border-border p-4">
        <Label className="mb-2 block text-sm font-medium">Seller override</Label>
        <div className="flex items-center gap-2">
          <select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            className={selectClass}
          >
            <option value="">Select seller</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={sellerPct}
            onChange={(e) => setSellerPct(Number(e.target.value))}
            className={inputClass}
          />
          <span className="text-sm text-muted-foreground">%</span>
          <Button
            type="button"
            size="sm"
            disabled={pending || !sellerId}
            onClick={() =>
              run(
                () => setSellerCommission(sellerId, sellerPct),
                'Seller override saved.'
              )
            }
          >
            <Plus className="mr-1 size-3" /> Add
          </Button>
        </div>
      </div>

      {/* Category override */}
      <div className="rounded-lg border border-border p-4">
        <Label className="mb-2 block text-sm font-medium">Category override</Label>
        <div className="flex items-center gap-2">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={selectClass}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={categoryPct}
            onChange={(e) => setCategoryPct(Number(e.target.value))}
            className={inputClass}
          />
          <span className="text-sm text-muted-foreground">%</span>
          <Button
            type="button"
            size="sm"
            disabled={pending || !categoryId}
            onClick={() =>
              run(
                () => setCategoryCommission(categoryId, categoryPct),
                'Category override saved.'
              )
            }
          >
            <Plus className="mr-1 size-3" /> Add
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {overrides.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Active overrides</p>
          {overrides.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>{o.label}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{o.percentage}%</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteCommission(o.id), 'Override removed.')}
                  className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  aria-label="Remove override"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Saving…
        </div>
      )}
    </div>
  );
}
