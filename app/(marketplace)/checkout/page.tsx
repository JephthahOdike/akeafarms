import Link from 'next/link';
import { Leaf, ShoppingBag, Bell, MapPin, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/helpers';
import { formatNaira } from '@/lib/utils';
import { getPlatformSettings } from '@/lib/settings/platform';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/brand/logo';
import { UserMenu } from '@/components/layout/user-menu';
import { CheckoutForm } from './_checkout-form';

// Private user area: never indexed by search engines.
export const metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false }
};

/* ------------------------------------------------------------------ */
/*  Type helpers                                                       */
/* ------------------------------------------------------------------ */

type MinimalProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  unit: string;
  stores: {
    store_id: string;
    name: string;
    slug: string;
    seller_id: string;
    business_name: string;
    logo_url: string | null;
    farm_name: string | null;
  };
};

type CartItemRow = {
  id: string;
  quantity: number;
  unit_price_snapshot: number;
  products: MinimalProduct;
};

export type SellerGroup = {
  sellerId: string;
  sellerName: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  logoUrl: string | null;
  farmName: string | null;
  farmState: string | null;
  items: {
    cartItemId: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    unit: string;
    lineTotal: number;
  }[];
  subtotal: number;
};

/* ------------------------------------------------------------------ */
/*  Server-side data fetch                                             */
/* ------------------------------------------------------------------ */

async function getCartData(userId: string) {
  const supabase = await createClient();

  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!cart) return null;

  const { data: cartItems, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      unit_price_snapshot,
      products!inner (
        id,
        name,
        slug,
        price,
        currency,
        unit,
        stores!inner (
          id,
          name,
          slug,
          logo_url,
          seller_id,
          farm_name,
          farm_state
        )
      )
    `)
    .eq('cart_id', cart.id);

  if (error) throw error;

  // Fetch public seller names (business_name is not directly readable by
  // buyers after the seller_profiles RLS hardening).
  const sellerIds = Array.from(
    new Set(
      (cartItems ?? [])
        .map((i) => (i.products as any)?.stores?.seller_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  let sellerNameById = new Map<string, string | null>();
  if (sellerIds.length) {
    const { data: sellerRows } = await supabase.rpc('get_public_seller_infos', {
      seller_profile_ids: sellerIds
    });
    sellerNameById = new Map(
      ((sellerRows ?? []) as { id: string; business_name: string | null }[]).map(
        (s) => [s.id, s.business_name]
      )
    );
  }
  for (const item of cartItems ?? []) {
    const store = (item.products as any)?.stores as any;
    if (store) {
      store.business_name = sellerNameById.get(store.seller_id) ?? null;
    }
  }

  const { data: addresses } = await supabase
    .from('shipping_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });

  return { cartItems: cartItems ?? [], addresses: addresses ?? [], cartId: cart.id };
}

/* ------------------------------------------------------------------ */
/*  Checkout page (server component)                                    */
/* ------------------------------------------------------------------ */

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-secondary/40 to-background p-4">
        <div className="text-center">
          <Leaf className="mx-auto size-12 text-primary" />
          <h2 className="mt-4 text-2xl font-bold">Sign in required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You must be signed in to proceed to checkout.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  let cartData;
  try {
    cartData = await getCartData(user.id);
  } catch (e) {
    console.error('Cart fetch error:', e);
    return (
      <div className="min-h-screen flex items-center justify-center py-24">
        <p className="text-destructive">Could not load your cart. Please try again.</p>
      </div>
    );
  }

  if (!cartData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-24">
        <ShoppingBag className="mx-auto size-16 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-bold">Your Cart is Empty</h2>
        <Button asChild size="lg" className="mt-6">
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  const sellerGroups = groupBySeller(cartData.cartItems as any);
  const itemsTotal = sellerGroups.reduce((sum, g) => sum + g.subtotal, 0);
  // Display only — the checkout API re-computes the fee server-side and
  // rejects the order if the client total does not match.
  const { shippingFlatFee: shippingFee } = await getPlatformSettings();
  const grandTotal = itemsTotal + shippingFee;

  return (
    <div className="flex flex-col flex-1">
      <Header profile={user.profile} />
      <main className="flex-1 overflow-y-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Review Your Order</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your order will be split by seller for fulfillment. Each seller will
              prepare and ship their items separately.
            </p>
          </div>

          <div className="space-y-6 mb-8">
            {sellerGroups.map((group) => (
              <SellerSection key={group.sellerId} group={group} />
            ))}
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Items Subtotal</span>
                  <span className="font-semibold">{formatNaira(itemsTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Shipping</span>
                  <span className="font-semibold">{formatNaira(shippingFee)}</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-border">
                  <span className="text-xl font-bold">Order Total</span>
                  <span className="text-2xl font-bold text-primary">{formatNaira(grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <h2 className="text-xl font-bold mb-4">Shipping & Payment</h2>
          <CheckoutForm
            userId={user.id}
            cartId={cartData.cartId}
            sellerGroups={sellerGroups}
            addresses={cartData.addresses}
            totalAmount={grandTotal}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function Header({ profile }: { profile: { id: string; full_name: string; email: string; role: string } }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>
          <UserMenu profile={profile as any} />
        </div>
      </div>
    </header>
  );
}

function SellerSection({ group }: { group: SellerGroup }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 pb-3">
        {group.logoUrl && (
          <img src={group.logoUrl} alt={group.sellerName} className="size-10 rounded-lg object-cover" />
        )}
        <div className="flex-1">
          <CardTitle className="text-lg">{group.sellerName}</CardTitle>
          {group.farmName && (
            <CardDescription>{group.farmName} · {group.farmState}</CardDescription>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{formatNaira(group.subtotal)}</p>
          <Link href={`/store/${group.storeSlug}`} className="text-xs text-primary hover:underline">
            View store →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {group.items.map((item) => (
            <div key={item.productId} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.quantity} × {item.unit} @ {formatNaira(item.unitPrice)}
                </p>
              </div>
              <p className="font-semibold">{formatNaira(item.lineTotal)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-border flex justify-between">
          <span className="font-medium">Store total</span>
          <span className="font-bold text-primary">{formatNaira(group.subtotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Footer() {
  return (
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
                <MapPin className="size-4 text-primary" /> Nationwide delivery
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="size-4 text-primary" /> Secure payments
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
  );
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                           */
/* ------------------------------------------------------------------ */

function groupBySeller(items: any[]): SellerGroup[] {
  const groups = new Map<string, SellerGroup>();

  for (const item of items) {
    const store: any = item.products.stores;
    const sellerId = store.seller_id;
    const sellerName = store.business_name ?? store.name ?? 'Unknown Seller';
    const unitPrice = Number(item.unit_price_snapshot ?? item.products.price ?? 0);
    const lineTotal = unitPrice * item.quantity;

    if (!groups.has(sellerId)) {
      groups.set(sellerId, {
        sellerId,
        sellerName,
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        logoUrl: store.logo_url ?? null,
        farmName: store.farm_name ?? null,
        farmState: store.farm_state ?? null,
        items: [],
        subtotal: 0
      });
    }

    const group = groups.get(sellerId)!;
    group.items.push({
      cartItemId: item.id,
      productId: item.products.id,
      productName: item.products.name,
      quantity: item.quantity,
      unitPrice,
      unit: item.products.unit,
      lineTotal
    });
    group.subtotal += lineTotal;
  }

  return Array.from(groups.values());
}
