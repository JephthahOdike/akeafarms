import Link from 'next/link';
import { ShoppingBag, Heart, Leaf, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/helpers';
import { formatNaira } from '@/lib/utils';
import CartItems from './_cart-items';
import CartSummary from './_cart-summary';
import { Logo } from '@/components/brand/logo';
import { UserMenu } from '@/components/layout/user-menu';

export const metadata = { title: 'Your Cart' };

export default async function CartPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Get user's cart
  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
    .single();

  // Get cart items with product details
  const { data: cartItems = [], error } = cart
    ? await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          unit_price_snapshot,
          products (
            id,
            name,
            slug,
            price,
            currency,
            unit,
            product_images (url, is_primary)
          )
        `)
        .eq('cart_id', cart.id)
    : { data: [], error: null };

  if (error) console.error('Cart fetch error:', error);

  const items = cartItems ?? [];
  const cartSummary = items.reduce(
    (acc, item) => {
      const product = item.products as any;
      const price = Number(item.unit_price_snapshot ?? product?.price ?? 0);
      return {
        subtotal: acc.subtotal + price * item.quantity,
        itemCount: acc.itemCount + item.quantity
      };
    },
    { subtotal: 0, itemCount: 0 }
  );

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-secondary/40 to-background p-4">
        <div className="text-center">
          <ShoppingBag className="mx-auto size-16 text-primary" />
          <h2 className="mt-4 text-2xl font-bold">Your Cart is Empty</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to add items to your cart and proceed to checkout.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/login">Sign in to continue</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="ml-auto flex items-center gap-2">
            <Button size="icon" variant="ghost" aria-label="Cart" className="relative">
              <ShoppingBag className="size-4" />
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                {cartSummary.itemCount}
              </span>
            </Button>
            <UserMenu profile={user.profile} />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-12 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag className="mx-auto size-16 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Your Cart is Empty</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Add products from our marketplace to get started. Enjoy fresh,
              farm-direct produce from verified Nigerian sellers.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">
                Your Cart ({items.length} item{items.length === 1 ? '' : 's'})
              </h2>
            </div>

            <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <CartItems items={items as any} />
              </div>

              {/* Cart Summary */}
              <div className="lg:col-span-1">
                <CartSummary
                  subtotal={cartSummary.subtotal}
                  itemCount={cartSummary.itemCount}
                />
              </div>
            </div>
          </>
          )}
      </main>

      <footer className="mt-24 border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2 space-y-4">
              <Logo />
              <p className="text-sm text-muted-foreground max-w-xs">
                Nigeria's agricultural marketplace — direct from verified
                farms, distributors and agro-businesses.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Leaf className="size-4 text-primary" /> Farm-fresh produce
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="size-4 text-primary" /> Nationwide delivery
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Heart className="size-4 text-primary" /> Buyer protection
                </li>
              </ul>
            </div>

            <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row">
              <p>© {new Date().getFullYear()} Akea Farms. All rights reserved.</p>
              <p>Made with care for Nigerian agriculture.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}