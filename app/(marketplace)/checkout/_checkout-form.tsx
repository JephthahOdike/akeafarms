'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Banknote, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNaira } from '@/lib/utils';
import type { SellerGroup } from './page';

type Address = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  country: string;
  postal_code: string | null;
  is_default: boolean;
};

export function CheckoutForm({
  userId,
  cartId,
  sellerGroups,
  addresses,
  totalAmount
}: {
  userId: string;
  cartId: string;
  sellerGroups: SellerGroup[];
  addresses: Address[];
  totalAmount: number;
}) {
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaystack = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    const form = e.currentTarget;
    let addressInfo: Record<string, string> = {};
    if (selectedAddressId !== 'new') {
      const addr = addresses.find((a) => a.id === selectedAddressId);
      if (addr) addressInfo = {
        addressId: addr.id,
        recipient_name: addr.recipient_name,
        phone: addr.phone,
        full_address: [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
        country: addr.country
      };
    } else {
      addressInfo = {
        addressId: '',
        recipient_name: (form.elements.namedItem('recipient_name') as HTMLInputElement)?.value || '',
        phone: (form.elements.namedItem('phone') as HTMLInputElement)?.value || '',
        full_address: (form.elements.namedItem('full_address') as HTMLInputElement)?.value || '',
        country: (form.elements.namedItem('country') as HTMLInputElement)?.value || 'Nigeria'
      };
    }

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        cartId,
        address: addressInfo,
        totalAmount,
        sellerGroupCount: sellerGroups.length
      })
    });

    const result = await res.json();
    if (!res.ok || !result.authorization_url) {
      setError(result.error || 'Failed to initialize payment.');
      setProcessing(false);
      return;
    }

    window.location.href = result.authorization_url;
  };

  return (
    <form onSubmit={handlePaystack} className="space-y-6">
      <div className="space-y-4">
        <Label className="text-sm font-medium">Shipping Address</Label>

        {addresses.length > 0 && (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="address_id"
                  value={addr.id}
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{addr.recipient_name}</span>
                    {addr.label && <span className="text-xs text-muted-foreground">({addr.label})</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {addr.address_line1}, {addr.address_line2 && <span>{addr.address_line2}, </span>}
                    {addr.city}, {addr.state}
                  </p>
                  <p className="text-sm text-muted-foreground">{addr.phone}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input
            type="radio"
            name="address_id"
            value="new"
            checked={selectedAddressId === 'new'}
            onChange={() => setSelectedAddressId('new')}
            className="mt-1"
          />
          <div className="flex-1">
            <span className="font-medium">Use a new address</span>
          </div>
        </label>

        <div
          className={`space-y-4 pt-2 transition-all ${selectedAddressId !== 'new' ? 'hidden' : ''}`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="recipient_name">Full Name *</Label>
              <Input id="recipient_name" name="recipient_name" required />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" type="tel" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="full_address">Address *</Label>
              <Input id="full_address" name="full_address" placeholder="Street, city, state" required />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue="Nigeria" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-sm font-medium">Payment Method</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
            <input type="radio" name="payment_method" value="paystack" defaultChecked className="mt-0.5" />
            <CreditCard className="size-5 text-primary" />
            <span className="flex-1">
              <span className="font-medium">Card / Bank Transfer (Paystack)</span>
              <span className="text-sm text-muted-foreground">Pay securely via Paystack</span>
            </span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 opacity-60">
            <Banknote className="size-5 text-muted-foreground" />
            <span className="flex-1">
              <span className="font-medium">Cash on Delivery</span>
              <span className="text-sm text-muted-foreground">Not yet available</span>
            </span>
            <input type="radio" name="payment_method" value="cod" disabled />
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={processing || cartId === ''}
      >
        {processing ? (
          <>Processing...</>
        ) : (
          <>
            Pay {formatNaira(totalAmount)} with Paystack
            <CheckCircle2 className="ml-2 size-4" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        By placing this order, you agree to our{' '}
        <Link href="/terms" className="hover:underline">Terms</Link> and{' '}
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}
