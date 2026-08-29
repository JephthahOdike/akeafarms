import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { sendOrderConfirmation, sendSellerNewOrder } from '@/lib/email';
import { shouldNotify } from '@/lib/notifications/preferences';
import { getPlatformSettings } from '@/lib/settings/platform';
import { SITE_URL } from '@/lib/utils';

/**
 * POST /api/checkout
 *
 * 0. Authenticates the user via session cookie
 * 1. Validates the request
 * 2. Fetches cart items with seller/store info
 * 3. Creates a parent order + order items grouped by seller
 * 4. Creates a pending payment record
 * 5. Initializes a Paystack transaction
 * 6. Returns the Paystack authorization_url
 */
export async function POST(request: NextRequest) {
  try {
    // ------------------------------------------------------------------
    // 0. Authenticate user — NEVER trust client-submitted userId
    // ------------------------------------------------------------------
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const userEmail = user.email || `${userId}@akeafarms.com`;

    const body = await request.json();
    const { cartId, address, totalAmount } = body;

    if (!cartId || !address || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: cartId, address, totalAmount' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // ------------------------------------------------------------------
    // 0a. Verify cart belongs to authenticated user
    // ------------------------------------------------------------------
    const { data: cart, error: cartOwnerError } = await supabase
      .from('carts')
      .select('id')
      .eq('id', cartId)
      .eq('user_id', userId)
      .maybeSingle();

    if (cartOwnerError || !cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------------
    // 1. Fetch cart items with product + seller info
    // ------------------------------------------------------------------
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        unit_price_snapshot,
        product_id,
        products!inner (
          id,
          name,
          slug,
          price,
          unit,
          store_id,
          stores!inner (
            id,
            seller_id
          )
        )
      `)
      .eq('cart_id', cartId);

    if (cartError || !cartItems?.length) {
      return NextResponse.json(
        { error: 'Cart is empty or could not be loaded' },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // 2. Create / reuse shipping address (verify ownership)
    // ------------------------------------------------------------------
    let shippingAddressId = address.addressId;
    if (shippingAddressId) {
      // Verify the address belongs to this user
      const { data: addrCheck } = await supabase
        .from('shipping_addresses')
        .select('id')
        .eq('id', shippingAddressId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!addrCheck) {
        return NextResponse.json(
          { error: 'Invalid shipping address' },
          { status: 400 }
        );
      }
    } else {
      const { data: newAddr, error: addrError } = await supabase
        .from('shipping_addresses')
        .insert({
          user_id: userId,
          recipient_name: address.recipient_name,
          phone: address.phone,
          address_line1: address.full_address || address.address_line1 || '',
          city: address.city || '',
          state: address.state || '',
          country: address.country || 'Nigeria'
        })
        .select('id')
        .single();

      if (addrError || !newAddr) {
        return NextResponse.json(
          { error: 'Failed to create shipping address' },
          { status: 500 }
        );
      }
      shippingAddressId = newAddr.id;
    }

    // ------------------------------------------------------------------
    // 3. Generate Paystack reference & order number
    // ------------------------------------------------------------------
    const paystackRef = `AF-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Calculate amounts
    const subtotal = cartItems.reduce((sum, item) => {
      const product = item.products as any;
      const price = Number(item.unit_price_snapshot ?? product?.price ?? 0);
      return sum + price * item.quantity;
    }, 0);
    // Admin-configured flat delivery fee (server-authoritative; the client
    // total is re-validated against this below).
    const platformSettings = await getPlatformSettings();
    const shippingFee = platformSettings.shippingFlatFee;
    const grandTotal = subtotal + shippingFee;

    // ------------------------------------------------------------------
    // 3a. Price integrity check: reject if client total mismatches
    // ------------------------------------------------------------------
    if (Math.abs(grandTotal - Number(totalAmount)) > 1) {
      return NextResponse.json(
        { error: 'Price mismatch detected. Please refresh and try again.' },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // 4. Create the parent order
    // ------------------------------------------------------------------
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: userId,
        shipping_address_id: shippingAddressId,
        status: 'created',
        subtotal,
        shipping_fee: shippingFee,
        discount: 0,
        total_amount: grandTotal,
        currency: 'NGN',
        metadata: { paystack_ref: paystackRef }
      })
      .select('id, order_number')
      .single();

    if (orderError || !order) {
      console.error('Order creation error:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 5. Create order items (one per cart item)
    // ------------------------------------------------------------------
    const orderItems = cartItems.map((item) => {
      const store = (item.products as any).stores as any;
      const sellerProfile = store?.seller_profiles as any;
      const unitPrice = Number(item.unit_price_snapshot ?? (item.products as any).price ?? 0);

      return {
        order_id: order.id,
        product_id: item.product_id,
        store_id: (item.products as any).store_id,
        seller_id: store?.seller_id,
        product_name_snapshot: (item.products as any).name,
        unit_price: unitPrice,
        quantity: item.quantity,
        line_total: unitPrice * item.quantity,
        status: 'created'
      };
    });

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items creation error:', itemsError);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 5b. Fire transactional emails (non-blocking; never fail checkout)
    // ------------------------------------------------------------------
    const buyerName =
      (user.user_metadata as Record<string, unknown> | null)?.full_name ||
      userEmail;
    const sellerIds = Array.from(
      new Set(
        cartItems
          .map((i) => (i.products as any).stores?.seller_id)
          .filter((id): id is string => Boolean(id))
      )
    );
    const itemsSummary = cartItems
      .map((i) => `${(i.products as any).name} × ${i.quantity}`)
      .join(', ');

    void (async () => {
      try {
        // Respect the buyer's order-update preference before emailing
        if (await shouldNotify(supabase, userId, 'order')) {
          await sendOrderConfirmation(
            userEmail,
            order.order_number,
            `<p style="color:#444;font-size:15px;line-height:1.6;margin:0">
             ${itemsSummary}<br/>Total: ₦${grandTotal.toLocaleString()}
           </p>`
          );
        }

        if (sellerIds.length) {
          const { data: sellerRows } = await supabase
            .from('seller_profiles')
            .select('id, user_id')
            .in('id', sellerIds);
          const userIds = (sellerRows ?? []).map((s) => s.user_id);
          if (userIds.length) {
            const { data: profileRows } = await supabase
              .from('profiles')
              .select('id, email')
              .in('id', userIds);
            const emailByUserId = new Map(
              (profileRows ?? []).map((p) => [p.id, p.email as string])
            );
            const userIdBySeller = new Map(
              (sellerRows ?? []).map((s) => [s.id, s.user_id as string])
            );
            for (const sid of sellerIds) {
              const uid = userIdBySeller.get(sid);
              const email = uid ? emailByUserId.get(uid) : undefined;
              // Respect each seller's order-update preference before emailing
              if (email && uid && (await shouldNotify(supabase, uid, 'order'))) {
                await sendSellerNewOrder(
                  email,
                  order.order_number,
                  String(buyerName),
                  `<p style="color:#444;font-size:15px;line-height:1.6;margin:0">${itemsSummary}</p>`
                );
              }
            }
          }
        }
      } catch (e) {
        console.error('[checkout] email error:', e);
      }
    })();

    // ------------------------------------------------------------------
    // 6. Create payment record (pending)
    // ------------------------------------------------------------------
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        provider: 'paystack',
        provider_reference: paystackRef,
        amount: grandTotal,
        currency: 'NGN',
        status: 'pending'
      });

    if (paymentError) {
      console.error('Payment record error:', paymentError);
    }

    // ------------------------------------------------------------------
    // 7. Clear cart
    // ------------------------------------------------------------------
    await supabase.from('cart_items').delete().eq('cart_id', cartId);

    // ------------------------------------------------------------------
    // 8. Initialize Paystack transaction
    // ------------------------------------------------------------------
    const paystackResponse = await initializePaystackTransaction({
      email: userEmail,
      amount: Math.round(grandTotal * 100), // Paystack expects kobo
      reference: paystackRef,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        user_id: userId
      }
    });

    if (!paystackResponse.authorization_url) {
      return NextResponse.json(
        { error: 'Failed to initialize payment with Paystack' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: paystackResponse.authorization_url,
      reference: paystackRef,
      order_number: order.order_number
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during checkout' },
      { status: 500 }
    );
  }
}

/**
 * Initialize a Paystack transaction
 */
async function initializePaystackTransaction(params: {
  email: string;
  amount: number;
  reference: string;
  metadata: Record<string, unknown>;
}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error('PAYSTACK_SECRET_KEY is not set');
    return { authorization_url: null };
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      metadata: params.metadata,
      callback_url: `${SITE_URL}/buyer/orders`
    })
  });

  const data = await response.json();
  return {
    authorization_url: data?.data?.authorization_url ?? null
  };
}
