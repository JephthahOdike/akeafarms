/**
 * Akea Farms — Support Ticket Server Actions (Phase 11)
 *
 * Functional support foundation on top of the support_tickets /
 * ticket_messages tables created in migration 0001 (RLS extended by 0019).
 *
 * Security model:
 *  - Identity is ALWAYS the authenticated session user; never formData.
 *  - Staff mutations require `support.manage` (admins pass implicitly) and
 *    are re-enforced by RLS policies backed by the same
 *    has_employee_permission() SQL — app checks and DB checks agree.
 *  - Users can only create/reply to their own tickets (RLS WITH CHECK,
 *    sender_id hardening) and can never write is_internal notes or change
 *    status/priority/assignment.
 *  - Staff internal notes (is_internal) are hidden from ticket owners at
 *    the RLS layer, not just in the UI.
 *  - Cross-user notification inserts use the service client (RLS confines
 *    user clients to their own rows).
 *  - Message bodies are sanitized (control chars stripped, length-limited)
 *    server-side; React escaping covers XSS at render time.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, requirePermission, hasPermission } from '@/lib/auth/helpers';
import { logAudit } from '@/lib/audit';
import type { SupportTicket } from '@/lib/types/database';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SettingsActionResult = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  ticketId?: string;
};

export type TicketParticipant = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
} | null;

export type TicketMessageView = {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  sender: TicketParticipant;
};

export type StaffTicketListItem = SupportTicket & {
  requester: TicketParticipant;
  assigned: TicketParticipant;
};

export type TicketListResult = {
  tickets: StaffTicketListItem[];
  page: number;
  totalPages: number;
  total: number;
};

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const TICKET_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

const ticketSchema = z.object({
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(150, 'Subject must be under 150 characters')
    .trim(),
  description: z
    .string()
    .min(10, 'Please describe your issue in at least 10 characters')
    .max(5000, 'Description must be under 5000 characters')
    .trim(),
  related_order: z.string().uuid().optional().or(z.literal(''))
});

/**
 * Strips control characters (except \n and \t) and hard-trims length.
 * Defense-in-depth: content is escaped by React on render; this keeps
 * junk payloads out of the database.
 */
function sanitizeText(input: string, maxLength: number): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, maxLength)
    .trim();
}

function generateTicketNumber(): string {
  const hex = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `TKT-${hex}`;
}

function revalidateTicketPaths(ticketId?: string, ownerRole?: string) {
  revalidatePath('/admin/support');
  if (ticketId) revalidatePath(`/admin/support/${ticketId}`);
  if (ownerRole === 'buyer') {
    revalidatePath('/buyer/support');
    if (ticketId) revalidatePath(`/buyer/support/${ticketId}`);
  }
  if (ownerRole === 'seller') {
    revalidatePath('/seller/support');
    if (ticketId) revalidatePath(`/seller/support/${ticketId}`);
  }
}

function supportPathForRole(role: string, ticketId: string): string {
  if (role === 'seller') return `/seller/support/${ticketId}`;
  return `/buyer/support/${ticketId}`;
}

/** Cross-user in-app notification (service client — RLS confines user clients). */
async function notifyProfile(
  userId: string,
  notification: { title: string; body: string; link: string }
) {
  try {
    const service = createServiceClient();
    await service.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: notification.title,
      body: notification.body,
      link: notification.link
    });
  } catch (e) {
    console.error('[support] notification error:', e);
  }
}

async function getProfileRole(profileId: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .maybeSingle();
  return data ? (data as { role: string }).role : null;
}

/* ------------------------------------------------------------------ */
/*  Ticket creation (any authenticated user)                           */
/* ------------------------------------------------------------------ */

export async function createSupportTicket(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const raw = {
    subject: formData.get('subject'),
    description: formData.get('description'),
    related_order: formData.get('related_order')
  };

  const parsed = ticketSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: 'Please fix the errors below.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((e) => [e.path.join('.'), e.message])
      )
    };
  }

  // Optional order link — only accepted when the order belongs to the
  // authenticated user. A client-supplied foreign order id is rejected.
  let relatedOrderId: string | null = null;
  if (parsed.data.related_order) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id')
      .eq('id', parsed.data.related_order)
      .maybeSingle();
    if (order && (order as { buyer_id: string }).buyer_id === user.id) {
      relatedOrderId = (order as { id: string }).id;
    } else {
      return {
        error: 'Please fix the errors below.',
        fieldErrors: { related_order: 'That order was not found on your account.' }
      };
    }
  }

  const subject = sanitizeText(parsed.data.subject, 150);
  const description = sanitizeText(parsed.data.description, 5000);

  // Insert through the RLS-governed user client. ticket_number uniqueness
  // is retried a few times in the (astronomically unlikely) collision case.
  let insertedId: string | null = null;
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 3 && !insertedId; attempt++) {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        ticket_number: generateTicketNumber(),
        user_id: user.id, // session identity — never client-supplied
        subject,
        description,
        related_order: relatedOrderId
      })
      .select('id, ticket_number')
      .single();

    if (!error && data) {
      insertedId = (data as { id: string }).id;
    } else {
      lastError = error?.message ?? 'unknown error';
      if (lastError && !lastError.includes('duplicate key')) break;
    }
  }

  if (!insertedId) {
    console.error('[support] ticket create error:', lastError);
    return { error: 'Failed to create your ticket. Please try again.' };
  }

  logAudit({
    user_id: user.id,
    action: 'SUPPORT_TICKET_CREATED',
    resource: 'support_tickets',
    resource_id: insertedId
  }).catch(() => {});

  revalidateTicketPaths(insertedId, user.profile.role);
  return { success: true, ticketId: insertedId };
}

/* ------------------------------------------------------------------ */
/*  Replies (owner or staff)                                           */
/* ------------------------------------------------------------------ */

export async function replyToTicket(
  ticketId: string,
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const staff = await hasPermission('support.manage');

  const rawMessage = String(formData.get('message') ?? '');
  const message = sanitizeText(rawMessage, 2000);
  if (message.length < 1) {
    return { error: 'Please write a reply before sending.', fieldErrors: { message: 'Reply cannot be empty.' } };
  }

  // Internal notes are a staff-only concept; the flag from the client is
  // only honored for staff (and RLS blocks non-staff writes regardless).
  const isInternal = staff && formData.get('is_internal') === 'true';

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, user_id, status')
    .eq('id', ticketId)
    .maybeSingle();

  if (!ticket) {
    return { error: 'Ticket not found.' };
  }
  const t = ticket as { id: string; ticket_number: string; user_id: string; status: string };

  const { error } = await supabase.from('ticket_messages').insert({
    ticket_id: t.id,
    sender_id: user.id,
    message,
    is_internal: isInternal
  });

  if (error) {
    console.error('[support] reply insert error:', error.message);
    return { error: 'Failed to send your reply. Please try again.' };
  }

  // Staff public replies notify the ticket owner; user replies notify the
  // assigned staff member (if any). Internal notes notify nobody.
  if (!isInternal && t.user_id !== user.id) {
    const ownerRole = await getProfileRole(t.user_id);
    await notifyProfile(t.user_id, {
      title: `Support replied to ${t.ticket_number}`,
      body: 'Our support team responded to your ticket. Open your support page to read it.',
      link: supportPathForRole(ownerRole ?? 'buyer', t.id)
    });
  } else if (!isInternal && !staff) {
    const { data: assignedRow } = await supabase
      .from('support_tickets')
      .select('assigned_to')
      .eq('id', t.id)
      .maybeSingle();
    const assignedTo = assignedRow
      ? (assignedRow as { assigned_to: string | null }).assigned_to
      : null;
    if (assignedTo && assignedTo !== user.id) {
      await notifyProfile(assignedTo, {
        title: `Customer replied to ${t.ticket_number}`,
        body: 'The ticket owner added a new message. Open the ticket to respond.',
        link: `/admin/support/${t.id}`
      });
    }
  }

  // Reopening semantics: a customer reply on a resolved/closed ticket moves
  // it back to open so it reappears in the staff queue.
  let reopened = false;
  if (!staff && (t.status === 'resolved' || t.status === 'closed')) {
    const { error: reopenErr } = await supabase
      .from('support_tickets')
      .update({ status: 'open' })
      .eq('id', t.id);
    reopened = !reopenErr;
  }

  logAudit({
    user_id: user.id,
    action: 'SUPPORT_TICKET_REPLIED',
    resource: 'support_tickets',
    resource_id: t.id,
    metadata: { is_internal: isInternal, by_staff: staff, reopened }
  }).catch(() => {});

  revalidateTicketPaths(t.id, user.profile.role);
  revalidatePath('/admin/support');
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Staff mutations (status / priority / assignment)                   */
/* ------------------------------------------------------------------ */

export async function updateTicketStatus(
  ticketId: string,
  status: string
): Promise<SettingsActionResult> {
  const staffUser = await requirePermission('support.manage');
  if (!TICKET_STATUSES.includes(status as TicketStatus)) {
    return { error: 'Invalid status.' };
  }

  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, user_id, status')
    .eq('id', ticketId)
    .maybeSingle();

  if (!ticket) return { error: 'Ticket not found.' };
  const t = ticket as { id: string; ticket_number: string; user_id: string; status: string };

  if (t.status === status) return { success: true };

  const { error } = await supabase
    .from('support_tickets')
    .update({ status })
    .eq('id', ticketId);

  if (error) {
    console.error('[support] status update error:', error.message);
    return { error: 'Failed to update ticket status.' };
  }

  const ownerRole = await getProfileRole(t.user_id);
  await notifyProfile(t.user_id, {
    title: `Ticket ${t.ticket_number} is now ${status.replace('_', ' ')}`,
    body: `The status of your support ticket was updated to "${status.replace('_', ' ')}".`,
    link: supportPathForRole(ownerRole ?? 'buyer', t.id)
  });

  logAudit({
    user_id: staffUser.id,
    action: 'SUPPORT_TICKET_STATUS_CHANGED',
    resource: 'support_tickets',
    resource_id: ticketId,
    metadata: { from: t.status, to: status, ticket_number: t.ticket_number }
  }).catch(() => {});

  revalidateTicketPaths(ticketId, ownerRole ?? undefined);
  return { success: true };
}

export async function updateTicketPriority(
  ticketId: string,
  priority: string
): Promise<SettingsActionResult> {
  const staffUser = await requirePermission('support.manage');
  if (!TICKET_PRIORITIES.includes(priority as TicketPriority)) {
    return { error: 'Invalid priority.' };
  }

  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, priority, user_id')
    .eq('id', ticketId)
    .maybeSingle();

  if (!ticket) return { error: 'Ticket not found.' };
  const t = ticket as { id: string; ticket_number: string; priority: string; user_id: string };

  if (t.priority === priority) return { success: true };

  const { error } = await supabase
    .from('support_tickets')
    .update({ priority })
    .eq('id', ticketId);

  if (error) {
    console.error('[support] priority update error:', error.message);
    return { error: 'Failed to update ticket priority.' };
  }

  logAudit({
    user_id: staffUser.id,
    action: 'SUPPORT_TICKET_PRIORITY_CHANGED',
    resource: 'support_tickets',
    resource_id: ticketId,
    metadata: { from: t.priority, to: priority, ticket_number: t.ticket_number }
  }).catch(() => {});

  const ownerRole = await getProfileRole(t.user_id);
  revalidateTicketPaths(ticketId, ownerRole ?? undefined);
  return { success: true };
}

export async function assignTicket(
  ticketId: string,
  assigneeId: string | null
): Promise<SettingsActionResult> {
  const staffUser = await requirePermission('support.manage');
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, assigned_to, user_id')
    .eq('id', ticketId)
    .maybeSingle();

  if (!ticket) return { error: 'Ticket not found.' };
  const t = ticket as { id: string; ticket_number: string; assigned_to: string | null; user_id: string };

  if (assigneeId) {
    // The assignee must be an active staff profile (admin or employee) —
    // verified server-side, never trusted from the client payload.
    const service = createServiceClient();
    const { data: assignee } = await service
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', assigneeId)
      .maybeSingle();

    if (!assignee) return { error: 'Assignee not found.' };
    const a = assignee as { role: string; is_active?: boolean };
    if (a.role !== 'admin' && a.role !== 'employee') {
      return { error: 'Tickets can only be assigned to staff.' };
    }
    if (a.is_active === false) {
      return { error: 'That staff account is deactivated.' };
    }
  }

  const { error } = await supabase
    .from('support_tickets')
    .update({ assigned_to: assigneeId })
    .eq('id', ticketId);

  if (error) {
    console.error('[support] assign error:', error.message);
    return { error: 'Failed to assign the ticket.' };
  }

  if (assigneeId && assigneeId !== t.assigned_to && assigneeId !== staffUser.id) {
    await notifyProfile(assigneeId, {
      title: `Ticket ${t.ticket_number} assigned to you`,
      body: 'A support ticket was assigned to you. Open the admin support queue to respond.',
      link: `/admin/support/${t.id}`
    });
  }

  logAudit({
    user_id: staffUser.id,
    action: 'SUPPORT_TICKET_ASSIGNED',
    resource: 'support_tickets',
    resource_id: ticketId,
    metadata: {
      from: t.assigned_to,
      to: assigneeId,
      ticket_number: t.ticket_number
    }
  }).catch(() => {});

  const ownerRole = await getProfileRole(t.user_id);
  revalidateTicketPaths(ticketId, ownerRole ?? undefined);
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Reads — staff queue & detail                                       */
/* ------------------------------------------------------------------ */

export async function getStaffTickets(options: {
  page?: number;
  status?: string;
  priority?: string;
  assignedToMe?: boolean;
  search?: string;
}): Promise<TicketListResult> {
  const staffUser = await requirePermission('support.manage');
  const supabase = await createClient();

  const page = Math.max(1, options.page ?? 1);
  const pageSize = 15;

  let query = supabase
    .from('support_tickets')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (options.status && TICKET_STATUSES.includes(options.status as TicketStatus)) {
    query = query.eq('status', options.status);
  }
  if (options.priority && TICKET_PRIORITIES.includes(options.priority as TicketPriority)) {
    query = query.eq('priority', options.priority);
  }
  if (options.assignedToMe) {
    query = query.eq('assigned_to', staffUser.id);
  }
  const search = sanitizeText(options.search ?? '', 80);
  if (search) {
    const escaped = search.replace(/[%_,()]/g, '');
    query = query.or(`subject.ilike.%${escaped}%,ticket_number.ilike.%${escaped}%`);
  }

  const { data, count } = await query;
  const tickets = (data ?? []) as SupportTicket[];
  const total = count ?? 0;

  const requesterIds = [...new Set(tickets.map((t) => t.user_id))];
  const assigneeIds = tickets
    .map((t) => t.assigned_to)
    .filter((id): id is string => Boolean(id));
  const profileIds = [...new Set([...requesterIds, ...assigneeIds])];

  // Profile data is fetched through the service client so support staff can
  // see requester contact info even without users.view. Only minimal
  // fields (name, email, role) are exposed to the support UI.
  const profileMap = new Map<string, TicketParticipant>();
  if (profileIds.length > 0) {
    const service = createServiceClient();
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', profileIds);
    for (const p of (profiles ?? []) as {
      id: string;
      full_name: string | null;
      email: string;
      role: string;
    }[]) {
      profileMap.set(p.id, {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: p.role
      });
    }
  }

  return {
    tickets: tickets.map((t) => ({
      ...t,
      requester: profileMap.get(t.user_id) ?? null,
      assigned: t.assigned_to ? profileMap.get(t.assigned_to) ?? null : null
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    total
  };
}

export async function getStaffTicketCounts(): Promise<{
  open: number;
  inProgress: number;
  unresolved: number;
}> {
  await requirePermission('support.manage');
  const supabase = await createClient();

  const { count: open } = await supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');
  const { count: inProgress } = await supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'in_progress');

  return {
    open: open ?? 0,
    inProgress: inProgress ?? 0,
    unresolved: (open ?? 0) + (inProgress ?? 0)
  };
}

export type StaffTicketDetail = {
  ticket: SupportTicket;
  requester: TicketParticipant;
  assigned: TicketParticipant;
  messages: TicketMessageView[];
  assignableStaff: { id: string; label: string }[];
};

export async function getStaffTicketDetail(
  ticketId: string
): Promise<StaffTicketDetail | null> {
  await requirePermission('support.manage');
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (!ticket) return null;

  const t = ticket as SupportTicket;

  const { data: messages } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  const senderIds = [...new Set((messages ?? []).map((m) => (m as { sender_id: string }).sender_id))];

  const service = createServiceClient();
  const profileIds = [...new Set([t.user_id, t.assigned_to, ...senderIds].filter((id): id is string => Boolean(id)))];

  const profileMap = new Map<string, TicketParticipant>();
  if (profileIds.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', profileIds);
    for (const p of (profiles ?? []) as {
      id: string;
      full_name: string | null;
      email: string;
      role: string;
    }[]) {
      profileMap.set(p.id, {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: p.role
      });
    }
  }

  // Assignment dropdown: active admins + employees (service client — the
  // staff viewer may not hold users.view, and only minimal fields are used).
  const { data: staffProfiles } = await service
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .in('role', ['admin', 'employee'])
    .eq('is_active', true)
    .order('role')
    .order('full_name');

  const assignableStaff = ((staffProfiles ?? []) as {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
  }[]).map((p) => ({
    id: p.id,
    label: `${p.role === 'admin' ? 'Admin' : 'Employee'} — ${p.full_name || p.email}`
  }));

  return {
    ticket: t,
    requester: profileMap.get(t.user_id) ?? null,
    assigned: t.assigned_to ? profileMap.get(t.assigned_to) ?? null : null,
    messages: ((messages ?? []) as {
      id: string;
      ticket_id: string;
      sender_id: string;
      message: string;
      is_internal: boolean;
      created_at: string;
    }[]).map((m) => ({
      ...m,
      sender: profileMap.get(m.sender_id) ?? null
    })),
    assignableStaff
  };
}

/* ------------------------------------------------------------------ */
/*  Reads — ticket owner (buyer/seller dashboards)                     */
/* ------------------------------------------------------------------ */

export type OwnerTicketListResult = {
  tickets: SupportTicket[];
  page: number;
  totalPages: number;
  total: number;
};

export async function getMyTickets(page = 1): Promise<OwnerTicketListResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const pageSize = 15;

  const { data, count } = await supabase
    .from('support_tickets')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const total = count ?? 0;
  return {
    tickets: (data ?? []) as SupportTicket[],
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    total
  };
}

export async function getMyTicketDetail(
  ticketId: string
): Promise<{ ticket: SupportTicket; messages: TicketMessageView[] } | null> {
  const user = await requireUser();
  const supabase = await createClient();

  // RLS ("tickets own") restricts this to the owner or an assigned staff
  // member; a foreign ticket id yields null → 404. Defence-in-depth: also
  // filter by user_id for the plain owner path.
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (!ticket) return null;
  const t = ticket as SupportTicket;
  if (t.user_id !== user.id) return null; // even if RLS allowed via assigned_to

  // is_internal notes are excluded for owners (also enforced by RLS after
  // the migration 0019 message-policy split — belt and braces).
  const { data: messages } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });

  const senderIds = [...new Set((messages ?? []).map((m) => (m as { sender_id: string }).sender_id))];
  const profileMap = new Map<string, TicketParticipant>();
  if (senderIds.length > 0) {
    const service = createServiceClient();
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', senderIds);
    for (const p of (profiles ?? []) as {
      id: string;
      full_name: string | null;
      email: string;
      role: string;
    }[]) {
      profileMap.set(p.id, {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: p.role
      });
    }
  }

  return {
    ticket: t,
    messages: ((messages ?? []) as {
      id: string;
      ticket_id: string;
      sender_id: string;
      message: string;
      is_internal: boolean;
      created_at: string;
    }[]).map((m) => ({
      ...m,
      sender: profileMap.get(m.sender_id) ?? null
    }))
  };
}
