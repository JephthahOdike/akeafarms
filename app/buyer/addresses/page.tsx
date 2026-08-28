import Link from 'next/link';
import { MapPin, Plus, Pencil } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { AddressCardActions } from '@/components/settings/address-card-actions';

export const metadata = { title: 'Saved Addresses' };

export default async function BuyerAddressesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: addresses } = await supabase
    .from('shipping_addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saved Addresses</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your delivery addresses.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/buyer/addresses/new">
            <Plus className="mr-1 size-4" />
            Add Address
          </Link>
        </Button>
      </div>

      {addresses && addresses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="rounded-xl border border-border bg-card p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{addr.recipient_name}</span>
                    {addr.is_default && (
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                        Default
                      </span>
                    )}
                    {addr.label && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {addr.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{addr.phone}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {addr.address_line1}
                    {addr.address_line2 && <>, {addr.address_line2}</>}
                    {addr.city && <>, {addr.city}</>}
                    {addr.state && <>, {addr.state}</>}
                    {addr.postal_code && <> · {addr.postal_code}</>}
                    {addr.country && <><br />{addr.country}</>}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <Link
                    href={`/buyer/addresses/${addr.id}/edit`}
                    className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    title="Edit address"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <AddressCardActions addressId={addr.id} isDefault={addr.is_default} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
          <MapPin className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No saved addresses</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a delivery address to make checkout faster.
          </p>
          <Button asChild className="mt-4">
            <Link href="/buyer/addresses/new">
              <Plus className="mr-1 size-4" />
              Add Address
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
