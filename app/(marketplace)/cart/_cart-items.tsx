'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';

interface CartItem {
  id: string;
  quantity: number;
  unit_price_snapshot: number;
  products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    currency: string;
    unit: string;
    product_images: Array<{ url: string; is_primary: boolean }>;
  };
}

interface CartItemsProps {
  items: CartItem[];
}

export default function CartItems({ items }: CartItemsProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    setUpdating(cartItemId);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId);

    if (error) {
      console.error('Failed to update cart quantity:', error);
    } else {
      window.location.reload();
    }
    setUpdating(null);
  };

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const product = item.products;
        const image = product.product_images?.find((i) => i.is_primary) ?? product.product_images?.[0];
        const unitPrice = Number(item.unit_price_snapshot ?? product?.price ?? 0);
        const lineTotal = unitPrice * item.quantity;

        return (
          <div key={item.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
            {image?.url && (
              <div className="flex-shrink-0">
                <Image
                  src={image.url}
                  alt={product.name}
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.unit} · {product.currency === 'NGN' ? '₦' : ''}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold text-primary">
                    {formatNaira(unitPrice)}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updating === item.id}
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    >
                      −
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updating === item.id}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
              <p className="mt-2 font-semibold text-foreground text-right">
                {formatNaira(lineTotal)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}