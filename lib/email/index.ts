/**
 * Akea Farms — Brevo Email Integration
 *
 * Transactional email service using Brevo (Sendinblue) API v3.
 * All functions are server-only — never import in client components.
 *
 * Required environment variables:
 *   BREVO_API_KEY     — Brevo API key
 *   BREVO_FROM_EMAIL  — Verified sender email
 *   BREVO_FROM_NAME   — Sender display name (default: "Akea Farms")
 */

import 'server-only';
import { SITE_URL } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EmailPayload {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

/* ------------------------------------------------------------------ */
/*  Core send function                                                 */
/* ------------------------------------------------------------------ */

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send a transactional email via Brevo.
 * Falls back to console logging when BREVO_API_KEY is not configured.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail =
    process.env.BREVO_SENDER_EMAIL ||
    process.env.BREVO_FROM_EMAIL ||
    'noreply@akeafarms.com';
  const fromName =
    process.env.BREVO_SENDER_NAME ||
    process.env.BREVO_FROM_NAME ||
    'Akea Farms';

  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY not set — logging email instead:');
    console.log('  To:', payload.to);
    console.log('  Subject:', payload.subject);
    console.log('  Body:', payload.html.substring(0, 200));
    return true; // don't block the app in dev
  }

  try {
    const res = await fetch(BREVO_API, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: payload.to, name: payload.toName || payload.to }],
        subject: payload.subject,
        htmlContent: payload.html
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[email] Brevo error:', err);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] Failed to send:', e);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Email HTML wrapper                                                 */
/* ------------------------------------------------------------------ */

const SITE_NAME = 'Akea Farms';
const SUPPORT_EMAIL = 'help.akeafarms@gmail.com';
const SUPPORT_PHONE = '08029965942';
const SUPPORT_WHATSAPP = '08100217845';

function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${SITE_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 0">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">

          <!-- Header -->
          <tr>
            <td style="background-color:#0a4d3b;padding:24px 32px;text-align:center">
              <img src="https://www.akeafarms.com/logo.svg" alt="${SITE_NAME}" width="48" height="48" style="display:block;margin:0 auto 8px">
              <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0">${SITE_NAME}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px">
              <h2 style="color:#0a4d3b;font-size:18px;font-weight:700;margin:0 0 16px">${title}</h2>
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e5e7eb;padding:24px 32px;background-color:#fafafa">
              <p style="color:#888;font-size:12px;line-height:1.6;margin:0 0 8px">
                This is an automated message from ${SITE_NAME}. Please do not reply directly to this email.
              </p>
              <p style="color:#888;font-size:12px;line-height:1.6;margin:0">
                Need help? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:#0a4d3b">${SUPPORT_EMAIL}</a>
                or call <a href="tel:+234${SUPPORT_PHONE}" style="color:#0a4d3b">${SUPPORT_PHONE}</a>
                &middot; WhatsApp: <a href="https://wa.me/234${SUPPORT_WHATSAPP}" style="color:#0a4d3b">${SUPPORT_WHATSAPP}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Auth emails                                                        */
/* ------------------------------------------------------------------ */

export async function sendPasswordReset(to: string, resetLink: string) {
  return sendEmail({
    to,
    subject: 'Reset your password',
    html: emailLayout(
      'Password Reset',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         You requested a password reset for your ${SITE_NAME} account.
       </p>
       <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
         <tr>
           <td align="center" style="background-color:#0a4d3b;border-radius:8px">
             <a href="${resetLink}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">Reset Password</a>
           </td>
         </tr>
       </table>
       <p style="color:#888;font-size:13px;line-height:1.5;margin:0">
         This link expires in 1 hour. If you did not request this, you can safely ignore this email.
       </p>`
    )
  });
}

/* ------------------------------------------------------------------ */
/*  Order emails (buyer)                                               */
/* ------------------------------------------------------------------ */

export async function sendOrderConfirmation(
  to: string,
  orderNumber: string,
  details: string
) {
  return sendEmail({
    to,
    subject: `Order ${orderNumber} confirmed`,
    html: emailLayout(
      'Order Confirmed',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Your order <strong>${orderNumber}</strong> has been confirmed and is being processed.
       </p>
       ${details}
       <table cellpadding="0" cellspacing="0" style="margin:24px 0 0">
         <tr>
           <td align="center" style="background-color:#0a4d3b;border-radius:8px">
             <a href="${SITE_URL}/buyer/orders" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">View Order</a>
           </td>
         </tr>
       </table>`
    )
  });
}

export async function sendPaymentConfirmation(
  to: string,
  orderNumber: string,
  amount: string
) {
  return sendEmail({
    to,
    subject: `Payment received for ${orderNumber}`,
    html: emailLayout(
      'Payment Confirmed',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Your payment of <strong>${amount}</strong> for order <strong>${orderNumber}</strong> has been received.
       </p>
       <p style="color:#444;font-size:15px;line-height:1.6;margin:0">
         Your order is now being processed by the seller(s). You will receive updates as your order progresses.
       </p>`
    )
  });
}

export async function sendOrderStatusUpdate(
  to: string,
  orderNumber: string,
  statusLabel: string,
  message?: string
) {
  return sendEmail({
    to,
    subject: `Order ${orderNumber} — ${statusLabel}`,
    html: emailLayout(
      `Order ${statusLabel}`,
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Your order <strong>${orderNumber}</strong> has been updated to: <strong>${statusLabel}</strong>.
       </p>
       ${message ? `<p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px">${message}</p>` : ''}
       <table cellpadding="0" cellspacing="0" style="margin:24px 0 0">
         <tr>
           <td align="center" style="background-color:#0a4d3b;border-radius:8px">
             <a href="${SITE_URL}/track" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">Track Order</a>
           </td>
         </tr>
       </table>`
    )
  });
}

export async function sendDispatchNotification(
  to: string,
  orderNumber: string,
  trackingCode?: string
) {
  return sendEmail({
    to,
    subject: `Order ${orderNumber} has been dispatched`,
    html: emailLayout(
      'Order Dispatched',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Great news! Your order <strong>${orderNumber}</strong> has been dispatched and is on its way.
       </p>
       ${trackingCode ? `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">Tracking code: <strong>${trackingCode}</strong></p>` : ''}
       <table cellpadding="0" cellspacing="0" style="margin:24px 0 0">
         <tr>
           <td align="center" style="background-color:#0a4d3b;border-radius:8px">
             <a href="${SITE_URL}/track" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">Track Delivery</a>
           </td>
         </tr>
       </table>`
    )
  });
}

export async function sendDeliveryNotification(
  to: string,
  orderNumber: string
) {
  return sendEmail({
    to,
    subject: `Order ${orderNumber} has been delivered`,
    html: emailLayout(
      'Order Delivered',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Your order <strong>${orderNumber}</strong> has been marked as delivered.
       </p>
       <p style="color:#444;font-size:15px;line-height:1.6;margin:0">
         If you have not received your order or have any concerns, please contact our support team.
       </p>`
    )
  });
}

/* ------------------------------------------------------------------ */
/*  Seller emails                                                      */
/* ------------------------------------------------------------------ */

export async function sendSellerNewOrder(
  to: string,
  orderNumber: string,
  buyerName: string,
  items: string
) {
  return sendEmail({
    to,
    subject: `New order ${orderNumber}`,
    html: emailLayout(
      'New Order Received',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 8px">
         You have a new order from <strong>${buyerName}</strong>.
       </p>
       <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Order: <strong>${orderNumber}</strong>
       </p>
       ${items}
       <table cellpadding="0" cellspacing="0" style="margin:24px 0 0">
         <tr>
           <td align="center" style="background-color:#0a4d3b;border-radius:8px">
             <a href="${SITE_URL}/seller/orders" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">Manage Orders</a>
           </td>
         </tr>
       </table>`
    )
  });
}

export async function sendSellerOrderStatus(
  to: string,
  orderNumber: string,
  statusLabel: string
) {
  return sendEmail({
    to,
    subject: `Order ${orderNumber} — ${statusLabel}`,
    html: emailLayout(
      'Order Status Update',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 8px">
         An order has been updated to: <strong>${statusLabel}</strong>.
       </p>
       <p style="color:#444;font-size:15px;line-height:1.6;margin:0">
         Order: <strong>${orderNumber}</strong>
       </p>`
    )
  });
}

/* ------------------------------------------------------------------ */
/*  Admin emails (minimal — don't spam)                                */
/* ------------------------------------------------------------------ */

export async function sendAdminNewSellerApplication(
  to: string,
  businessName: string,
  sellerId: string
) {
  return sendEmail({
    to,
    subject: `New seller application: ${businessName}`,
    html: emailLayout(
      'New Seller Application',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         <strong>${businessName}</strong> has submitted a seller application and is pending review.
       </p>
       <table cellpadding="0" cellspacing="0" style="margin:24px 0 0">
         <tr>
           <td align="center" style="background-color:#0a4d3b;border-radius:8px">
             <a href="${SITE_URL}/admin/sellers" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">Review Sellers</a>
           </td>
         </tr>
       </table>`
    )
  });
}

/* ------------------------------------------------------------------ */
/*  Welcome email (registration)                                       */
/* ------------------------------------------------------------------ */

export async function sendWelcomeEmail(to: string, fullName: string) {
  const firstName = fullName.trim().split(/\s+/)[0] || 'there';
  return sendEmail({
    to,
    toName: fullName,
    subject: 'Welcome to Akea Farms',
    html: emailLayout(
      `Welcome, ${escapeHtml(firstName)}!`,
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Thank you for joining <strong>${SITE_NAME}</strong> — Nigeria's marketplace for fresh farm produce.
       </p>
       <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Browse thousands of farm-fresh products from verified sellers, delivered straight to your door.
       </p>
       <table cellpadding="0" cellspacing="0" style="margin:24px 0 0">
         <tr>
           <td align="center" style="background-color:#0a4d3b;border-radius:8px">
             <a href="${SITE_URL}/products" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">Start Shopping</a>
           </td>
         </tr>
       </table>`
    )
  });
}

/* ------------------------------------------------------------------ */
/*  Seller account emails (approval / rejection)                       */
/* ------------------------------------------------------------------ */

export async function sendSellerApproved(to: string, businessName: string) {
  return sendEmail({
    to,
    subject: 'Your Akea Farms seller account has been approved',
    html: emailLayout(
      'Seller Account Approved',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Congratulations! Your seller application for <strong>${escapeHtml(businessName)}</strong> has been approved.
       </p>
       <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Your store is now live on the Akea Farms marketplace. You can start listing your products and receiving orders.
       </p>
       <table cellpadding="0" cellspacing="0" style="margin:24px 0 0">
         <tr>
           <td align="center" style="background-color:#0a4d3b;border-radius:8px">
             <a href="${SITE_URL}/seller" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">Go to Seller Dashboard</a>
           </td>
         </tr>
       </table>`
    )
  });
}

export async function sendSellerRejected(
  to: string,
  businessName: string,
  reason?: string
) {
  return sendEmail({
    to,
    subject: 'Update on your Akea Farms seller application',
    html: emailLayout(
      'Seller Application Update',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Thank you for your interest in selling on ${SITE_NAME}. After review, we are unable to approve the seller application for <strong>${escapeHtml(businessName)}</strong> at this time.
       </p>
       ${reason ? `<p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px"><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}
       <p style="color:#444;font-size:15px;line-height:1.6;margin:0">
         If you believe this was a mistake or would like to reapply, please contact our support team.
       </p>`
    )
  });
}

/* ------------------------------------------------------------------ */
/*  Settlement email (seller)                                          */
/* ------------------------------------------------------------------ */

export async function sendSettlementPaid(
  to: string,
  settlementNumber: string,
  amount: string
) {
  return sendEmail({
    to,
    subject: `Settlement ${settlementNumber} paid — ${amount}`,
    html: emailLayout(
      'Settlement Paid',
      `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 16px">
         Your settlement <strong>${escapeHtml(settlementNumber)}</strong> of <strong>${amount}</strong> has been processed and paid to your registered bank account.
       </p>
       <p style="color:#888;font-size:13px;line-height:1.5;margin:0">
         Bank transfers may take 1–2 business days to reflect depending on your bank.
       </p>
       <table cellpadding="0" cellspacing="0" style="margin:24px 0 0">
         <tr>
           <td align="center" style="background-color:#0a4d3b;border-radius:8px">
             <a href="${SITE_URL}/seller/wallet" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">View Wallet</a>
           </td>
         </tr>
       </table>`
    )
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Escape user-provided values interpolated into email HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
