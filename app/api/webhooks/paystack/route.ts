import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { logAudit } from '@/lib/audit';
import { sendPaymentConfirmation } from '@/lib/email';
import { shouldNotify } from '@/lib/notifications/preferences';
import crypto from 'crypto';

/**
 * POST /api/webhooks/paystack
 *
 * Handles Paystack webhook events:
 * - charge.success: confirms payment, updates order status, generates invoice, credits seller wallet
 *
 * Financial integrity is guaranteed by the SECURITY DEFINER function
 * `process_paystack_charge`, which runs the payment + wallet credit steps
 * atomically in a single transaction (see migration 0008).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // Verify webhook signature
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    if (eventType === 'charge.success') {
      await handleChargeSuccess(event.data);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Handle a successful Paystack charge
 */
async function handleChargeSuccess(data: any) {
  const supabase = createServiceClient();
  const reference = data.reference;
  const amount = data.amount / 100; // convert from kobo to NGN
  const metadata = data.metadata || {};

  if (!reference) {
    console.error('No reference in Paystack charge data');
    return;
  }

  // Verify payment amount matches order total (prevent amount tampering)
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .select(`
      id,
      order_id,
      amount,
      orders!inner (
        total_amount
      )
    `)
    .eq('provider_reference', reference)
    .single();

  if (paymentError) {
    console.error('Failed to fetch payment record for reference:', reference, paymentError);
    return;
  }

  if (!paymentData) {
    console.error('Payment record not found for reference:', reference);
    return;
  }

  // Verify amount matches (allow 1 NGN tolerance for currency rounding)
  const amountDifference = Math.abs(amount - paymentData.amount);
  if (amountDifference > 1) {
    console.error(`Amount mismatch for reference ${reference}: Paystack amount ₦${amount} != Order total ₦${paymentData.amount}`);
    return;
  }

  // Calculate provider fee (Paystack charges 1.5% + NGN 100 for local transactions, capped at NGN 2000)
  const providerFee = Math.min(amount * 0.015 + 100, 2000);

  // Atomic, transactional processing. Credits all sellers or rolls back entirely.
  const { data: result, error } = await supabase.rpc('process_paystack_charge', {
    p_reference: reference,
    p_amount: amount,
    p_provider_fee: providerFee,
    p_channel: data.channel || null,
    p_paid_at: data.paid_at || new Date().toISOString(),
    p_raw_payload: data
  });

  if (error) {
    console.error('Paystack charge processing error:', error);
    return;
  }

  if (!result || result.status === 'not_found') {
    console.error('Payment record not found for reference:', reference);
    return;
  }

  if (result.status === 'already_processed') {
    console.log('Payment already processed:', reference);
    return;
  }

  // Generate invoice
  await generateInvoice(supabase, result.order_id, result.buyer_id, amount);

  // Respect the buyer's notification preferences before creating/sending anything
  const notifyPayment = await shouldNotify(supabase, result.buyer_id, 'payment');

  // Create notification for buyer
  if (notifyPayment) {
    await supabase.from('notifications').insert({
      user_id: result.buyer_id,
      type: 'payment',
      title: 'Payment Confirmed',
      body: `Your payment of ₦${amount.toLocaleString()} for order #${result.order_number} has been confirmed.`,
      link: `/buyer/orders`,
      metadata: { order_id: result.order_id, reference }
    });
  }

  // Audit: log payment confirmation
  logAudit({
    user_id: result.buyer_id,
    action: 'payment_confirmed',
    resource: 'payments',
    resource_id: result.payment_id,
    metadata: { order_id: result.order_id, order_number: result.order_number, amount, reference }
  }).catch(() => {});

  // Non-blocking payment confirmation email
  if (notifyPayment) {
    void (async () => {
      try {
        const { data: buyer } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', result.buyer_id)
          .single();
        if (buyer?.email) {
          await sendPaymentConfirmation(
            buyer.email,
            result.order_number,
            `₦${amount.toLocaleString()}`
          );
        }
      } catch (e) {
        console.error('[webhook] email error:', e);
      }
    })();
  }
}

/**
 * Generate an invoice record for a paid order
 */
async function generateInvoice(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: string,
  buyerId: string,
  amount: number
) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.random().toString(36).substring(2, 6).toUpperCase();
  const invoiceNumber = `INV-${dateStr}-${seq}`;

  const { error } = await supabase.from('invoices').insert({
    invoice_number: invoiceNumber,
    order_id: orderId,
    buyer_id: buyerId,
    total_amount: amount
  });

  if (error) {
    console.error('Invoice creation error:', error);
  }
}
