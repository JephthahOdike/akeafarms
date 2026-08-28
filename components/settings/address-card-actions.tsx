'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Star } from 'lucide-react';
import { deleteAddress, setDefaultAddress } from '@/lib/settings/actions';

export function AddressCardActions({
  addressId,
  isDefault
}: {
  addressId: string;
  isDefault: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm('Delete this address? This action cannot be undone.')) return;
    startTransition(async () => {
      await deleteAddress(addressId);
      router.refresh();
    });
  };

  const handleSetDefault = () => {
    startTransition(async () => {
      await setDefaultAddress(addressId);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-0.5">
      {!isDefault && (
        <button
          onClick={handleSetDefault}
          disabled={isPending}
          className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Set as default"
        >
          <Star className="size-4" />
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        title="Delete address"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
