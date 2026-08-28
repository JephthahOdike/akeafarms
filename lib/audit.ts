/**
 * Akea Farms — Audit Logging
 *
 * Records sensitive admin and financial operations for security
 * and compliance. Uses the service client to bypass RLS.
 */

import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';

export interface AuditEntry {
  user_id?: string;
  action: string;
  resource: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('audit_logs').insert({
      user_id: entry.user_id,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resource_id,
      metadata: entry.metadata || {},
      ip_address: undefined // Next.js doesn't expose raw IP in serverless
    });
  } catch (e) {
    // Audit logging failure should never break the main flow
    console.error('[audit] Failed to log:', e);
  }
}

// Convenience helpers
export async function logAdminLogin(userId: string) {
  return logAudit({ user_id: userId, action: 'admin_login', resource: 'auth' });
}

export async function logSellerApproval(
  adminId: string,
  sellerId: string,
  approved: boolean
) {
  return logAudit({
    user_id: adminId,
    action: approved ? 'seller_approved' : 'seller_rejected',
    resource: 'seller_profiles',
    resource_id: sellerId
  });
}

export async function logPaymentStatusChange(
  userId: string,
  paymentId: string,
  oldStatus: string,
  newStatus: string
) {
  return logAudit({
    user_id: userId,
    action: 'payment_status_change',
    resource: 'payments',
    resource_id: paymentId,
    metadata: { old_status: oldStatus, new_status: newStatus }
  });
}

export async function logSettlementApproval(
  adminId: string,
  settlementId: string,
  amount: number
) {
  return logAudit({
    user_id: adminId,
    action: 'settlement_approved',
    resource: 'settlements',
    resource_id: settlementId,
    metadata: { amount }
  });
}
