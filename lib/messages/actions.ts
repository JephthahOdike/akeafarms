'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, hasPermission } from '@/lib/auth/helpers';
import { MAX_MESSAGE_LENGTH } from '@/lib/messages/constants';

/**
 * Phase 12 — secure seller ↔ buyer messaging.
 *
 * Every read/write goes through the caller's RLS-scoped Supabase client:
 *   * conversations/message rows are only visible to participants,
 *     admins, and employees granted `messages.view`
 *   * message bodies can never be edited (UPDATE is column-locked to
 *     read_at) or deleted through user clients
 *   * the seller side of a conversation is always resolved server-side
 *     from the product → store → seller_profiles chain — a client-supplied
 *     seller id is never trusted
 * Service client is used ONLY to enrich display names (profiles are
 * RLS-hidden between users) and to insert cross-user notifications.
 */

export type MessageActionResult = {
  success?: boolean;
  error?: string;
  conversationId?: string;
};

export type ConversationListItem = {
  id: string;
  counterpart_name: string;
  product_name: string | null;
  product_slug: string | null;
  last_message: { body: string; created_at: string; from_me: boolean } | null;
  unread_count: number;
  last_message_at: string;
};

export type ConversationMessageView = {
  id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  from_me: boolean;
  sender_name: string;
};

export type ConversationDetail = {
  id: string;
  created_at: string;
  participant: boolean;
  staffView: boolean;
  buyer_name: string;
  seller_name: string;
  product_name: string | null;
  product_slug: string | null;
  messages: ConversationMessageView[];
} | null;

function sanitizeMessage(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

/** Seller profile ids owned by the caller (usually 0 or 1). */
async function mySellerProfileIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('seller_profiles')
    .select('id')
    .eq('user_id', userId);
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

/* ------------------------------------------------------------------ */
/*  Conversation list (buyer + seller side)                            */
/* ------------------------------------------------------------------ */

export async function getMyConversations(): Promise<ConversationListItem[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const spIds = await mySellerProfileIds(user.id);

  let query = supabase
    .from('conversations')
    .select('id, buyer_id, seller_id, product_id, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(50);

  query = spIds.length
    ? query.or(`buyer_id.eq.${user.id},seller_id.in.(${spIds.join(',')})`)
    : query.eq('buyer_id', user.id);

  const { data: convs, error } = await query;
  if (error || !convs || convs.length === 0) return [];

  const rows = convs as {
    id: string;
    buyer_id: string;
    seller_id: string;
    product_id: string | null;
    last_message_at: string;
  }[];
  const convIds = rows.map((r) => r.id);

  // Last message + unread counts, in a single batched query.
  const { data: msgs } = await supabase
    .from('conversation_messages')
    .select('conversation_id, body, sender_id, read_at, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false });

  type Msg = {
    conversation_id: string;
    body: string;
    sender_id: string;
    read_at: string | null;
    created_at: string;
  };
  const lastByConv = new Map<string, Msg>();
  const unreadByConv = new Map<string, number>();
  for (const raw of (msgs ?? []) as Msg[]) {
    if (!lastByConv.has(raw.conversation_id)) lastByConv.set(raw.conversation_id, raw);
    if (raw.sender_id !== user.id && !raw.read_at) {
      unreadByConv.set(raw.conversation_id, (unreadByConv.get(raw.conversation_id) ?? 0) + 1);
    }
  }

  // Display names via the service client — profiles are RLS-hidden
  // between users, and store names live on seller_profiles.
  const buyerIds = Array.from(new Set(rows.map((r) => r.buyer_id)));
  const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id)));
  const productIds = rows
    .map((r) => r.product_id)
    .filter((id): id is string => Boolean(id));

  const service = createServiceClient();
  const [buyersRes, sellersRes, productsRes] = await Promise.all([
    buyerIds.length
      ? service.from('profiles').select('id, full_name').in('id', buyerIds)
      : Promise.resolve({ data: [] as unknown, error: null }),
    sellerIds.length
      ? service.from('seller_profiles').select('id, business_name').in('id', sellerIds)
      : Promise.resolve({ data: [] as unknown, error: null }),
    productIds.length
      ? service.from('products').select('id, name, slug').in('id', productIds)
      : Promise.resolve({ data: [] as unknown, error: null })
  ]);

  const buyerName = new Map<string, string>();
  for (const p of (buyersRes.data ?? []) as { id: string; full_name: string }[]) {
    buyerName.set(p.id, p.full_name || 'Buyer');
  }
  const sellerName = new Map<string, string>();
  for (const s of (sellersRes.data ?? []) as { id: string; business_name: string }[]) {
    sellerName.set(s.id, s.business_name || 'Seller');
  }
  const productNameById = new Map<string, { name: string; slug: string }>();
  for (const p of (productsRes.data ?? []) as { id: string; name: string; slug: string }[]) {
    productNameById.set(p.id, { name: p.name, slug: p.slug });
  }

  return rows.map((c) => {
    const viewerIsSeller = spIds.includes(c.seller_id);
    const last = lastByConv.get(c.id);
    const product = c.product_id ? productNameById.get(c.product_id) : undefined;
    return {
      id: c.id,
      counterpart_name: viewerIsSeller
        ? buyerName.get(c.buyer_id) ?? 'Buyer'
        : sellerName.get(c.seller_id) ?? 'Seller',
      product_name: product?.name ?? null,
      product_slug: product?.slug ?? null,
      last_message: last
        ? { body: last.body, created_at: last.created_at, from_me: last.sender_id === user.id }
        : null,
      unread_count: unreadByConv.get(c.id) ?? 0,
      last_message_at: c.last_message_at
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Staff (admin / messages.view employees) conversation list          */
/* ------------------------------------------------------------------ */

export async function getStaffConversations(): Promise<ConversationListItem[]> {
  const allowed = await hasPermission('messages.view');
  if (!allowed) return [];

  const service = createServiceClient();
  const { data: convs, error } = await service
    .from('conversations')
    .select('id, buyer_id, seller_id, product_id, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error || !convs || convs.length === 0) return [];

  const rows = convs as {
    id: string;
    buyer_id: string;
    seller_id: string;
    product_id: string | null;
    last_message_at: string;
  }[];

  // Latest message per conversation for preview.
  const { data: msgs } = await service
    .from('conversation_messages')
    .select('conversation_id, body, sender_id, created_at')
    .in('conversation_id', rows.map((r) => r.id))
    .order('created_at', { ascending: false });

  type Msg = { conversation_id: string; body: string; sender_id: string; created_at: string };
  const lastByConv = new Map<string, Msg>();
  for (const raw of (msgs ?? []) as Msg[]) {
    if (!lastByConv.has(raw.conversation_id)) lastByConv.set(raw.conversation_id, raw);
  }

  const buyerIds = Array.from(new Set(rows.map((r) => r.buyer_id)));
  const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id)));
  const productIds = rows.map((r) => r.product_id).filter((id): id is string => Boolean(id));

  const [buyersRes, sellersRes, productsRes] = await Promise.all([
    service.from('profiles').select('id, full_name').in('id', buyerIds),
    service.from('seller_profiles').select('id, business_name').in('id', sellerIds),
    productIds.length
      ? service.from('products').select('id, name, slug').in('id', productIds)
      : Promise.resolve({ data: [] as unknown, error: null })
  ]);

  const buyerName = new Map<string, string>();
  for (const p of (buyersRes.data ?? []) as { id: string; full_name: string }[]) {
    buyerName.set(p.id, p.full_name || 'Buyer');
  }
  const sellerName = new Map<string, string>();
  for (const s of (sellersRes.data ?? []) as { id: string; business_name: string }[]) {
    sellerName.set(s.id, s.business_name || 'Seller');
  }
  const productNameById = new Map<string, { name: string; slug: string }>();
  for (const p of (productsRes.data ?? []) as { id: string; name: string; slug: string }[]) {
    productNameById.set(p.id, { name: p.name, slug: p.slug });
  }

  return rows.map((c) => {
    const last = lastByConv.get(c.id);
    const product = c.product_id ? productNameById.get(c.product_id) : undefined;
    return {
      id: c.id,
      counterpart_name: `${buyerName.get(c.buyer_id) ?? 'Buyer'} ↔ ${sellerName.get(c.seller_id) ?? 'Seller'}`,
      product_name: product?.name ?? null,
      product_slug: product?.slug ?? null,
      last_message: last ? { body: last.body, created_at: last.created_at, from_me: false } : null,
      unread_count: 0,
      last_message_at: c.last_message_at
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Conversation detail (with mark-as-read on open)                    */
/* ------------------------------------------------------------------ */

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  if (!isUuid(conversationId)) return null;

  const user = await requireUser();
  const supabase = await createClient();

  // RLS guarantees only participants / staff can read the row.
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id, product_id, created_at')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv) return null;

  const c = conv as {
    id: string;
    buyer_id: string;
    seller_id: string;
    product_id: string | null;
    created_at: string;
  };

  const spIds = await mySellerProfileIds(user.id);
  const isBuyer = c.buyer_id === user.id;
  const isSeller = spIds.includes(c.seller_id);
  const staff = await hasPermission('messages.view');

  // Unauthorized conversation-ID access → identical response to "missing".
  if (!isBuyer && !isSeller && !staff) return null;

  const { data: msgs } = await supabase
    .from('conversation_messages')
    .select('id, sender_id, body, read_at, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  type Msg = {
    id: string;
    sender_id: string;
    body: string;
    read_at: string | null;
    created_at: string;
  };

  // Opening the conversation marks the other party's messages read
  // (participants only — the RLS UPDATE policy scope enforces this).
  if (isBuyer || isSeller) {
    await supabase
      .from('conversation_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);
  }

  // Display names via the service client (profiles are RLS-hidden
  // between users).
  const service = createServiceClient();
  const senderIds = Array.from(
    new Set((((msgs ?? []) as Msg[]).map((m) => m.sender_id)).concat([c.buyer_id]))
  );
  const [profilesRes, sellerRes, productRes] = await Promise.all([
    service.from('profiles').select('id, full_name').in('id', senderIds),
    service.from('seller_profiles').select('id, business_name').eq('id', c.seller_id).maybeSingle(),
    c.product_id
      ? service.from('products').select('id, name, slug').eq('id', c.product_id).maybeSingle()
      : Promise.resolve({ data: null as unknown, error: null })
  ]);

  const senderName = new Map<string, string>();
  for (const p of (profilesRes.data ?? []) as { id: string; full_name: string }[]) {
    senderName.set(p.id, p.full_name || 'User');
  }
  const sellerBusiness =
    ((sellerRes.data ?? null) as { business_name: string } | null)?.business_name ?? 'Seller';
  const product = (productRes.data ?? null) as { name: string; slug: string } | null;

  return {
    id: c.id,
    created_at: c.created_at,
    participant: isBuyer || isSeller,
    staffView: !isBuyer && !isSeller,
    buyer_name: isBuyer ? senderName.get(c.buyer_id) ?? 'You' : senderName.get(c.buyer_id) ?? 'Buyer',
    seller_name: sellerBusiness,
    product_name: product?.name ?? null,
    product_slug: product?.slug ?? null,
    messages: (((msgs ?? []) as Msg[])).map((m) => ({
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      read_at: m.read_at,
      from_me: m.sender_id === user.id,
      sender_name: m.sender_id === user.id ? 'You' : senderName.get(m.sender_id) ?? 'User'
    }))
  };
}

/* ------------------------------------------------------------------ */
/*  Send a message                                                     */
/* ------------------------------------------------------------------ */

export async function sendMessageToConversation(
  conversationId: string,
  _prev: MessageActionResult | null,
  formData: FormData
): Promise<MessageActionResult> {
  if (!isUuid(conversationId)) return { error: 'Conversation not found.' };

  const user = await requireUser();
  const supabase = await createClient();

  const body = sanitizeMessage(String(formData.get('body') ?? ''));
  if (!body) return { error: 'Message cannot be empty.' };

  // Participation is verified server-side; the INSERT policy backs this
  // up at the database layer regardless.
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv) return { error: 'Conversation not found.' };

  const c = conv as { id: string; buyer_id: string; seller_id: string };
  const spIds = await mySellerProfileIds(user.id);
  const viewerIsSeller = spIds.includes(c.seller_id);
  if (c.buyer_id !== user.id && !viewerIsSeller) {
    return { error: 'You are not part of this conversation.' };
  }

  const { error: insertErr } = await supabase.from('conversation_messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body
  });
  if (insertErr) {
    console.error('[messages] insert error:', insertErr.message);
    return { error: 'Failed to send your message. Please try again.' };
  }

  // In-app notification for the other party (cross-user → service client).
  const service = createServiceClient();
  if (c.buyer_id === user.id) {
    // Recipient: the store owner.
    const { data: sp } = await service
      .from('seller_profiles')
      .select('user_id')
      .eq('id', c.seller_id)
      .maybeSingle();
    const sellerUserId = (sp as { user_id: string } | null)?.user_id;
    if (sellerUserId) {
      await service.from('notifications').insert({
        user_id: sellerUserId,
        type: 'message',
        title: 'New message from a buyer',
        body: body.slice(0, 140),
        link: `/seller/messages/${conversationId}`,
        metadata: { conversation_id: conversationId }
      });
    }
  } else {
    await service.from('notifications').insert({
      user_id: c.buyer_id,
      type: 'message',
      title: 'New message from the seller',
      body: body.slice(0, 140),
      link: `/buyer/messages/${conversationId}`,
      metadata: { conversation_id: conversationId }
    });
  }

  revalidatePath(`/buyer/messages/${conversationId}`);
  revalidatePath(`/seller/messages/${conversationId}`);
  revalidatePath('/buyer/messages');
  revalidatePath('/seller/messages');
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Start a conversation from a product page                           */
/* ------------------------------------------------------------------ */

export async function startConversationWithSeller(
  _prev: MessageActionResult | null,
  formData: FormData
): Promise<MessageActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const productId = String(formData.get('product_id') ?? '');
  if (!isUuid(productId)) return { error: 'Product not found.' };

  // Resolve product → store → seller server-side. A client-supplied
  // seller id is never trusted.
  const { data: product } = await supabase
    .from('products')
    .select('id, name, store_id')
    .eq('id', productId)
    .maybeSingle();
  if (!product) return { error: 'Product not found.' };

  const { data: store } = await supabase
    .from('stores')
    .select('id, seller_id')
    .eq('id', ((product as { store_id: string }).store_id))
    .maybeSingle();
  const sellerId = (store as { seller_id: string } | null)?.seller_id;
  if (!sellerId) return { error: 'This product has no seller to message.' };

  // The store owner cannot start a conversation with themselves.
  const { data: sp } = await supabase
    .from('seller_profiles')
    .select('user_id')
    .eq('id', sellerId)
    .maybeSingle();
  if ((sp as { user_id: string } | null)?.user_id === user.id) {
    return { error: 'You cannot message your own store.' };
  }

  // Find-or-create (unique index backstops the race).
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('seller_id', sellerId)
    .eq('product_id', productId)
    .maybeSingle();

  let conversationId: string | null = (existing as { id: string } | null)?.id ?? null;

  if (!conversationId) {
    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ buyer_id: user.id, seller_id: sellerId, product_id: productId })
      .select('id')
      .single();
    if (created) {
      conversationId = (created as { id: string }).id;
    } else if (error) {
      // Concurrent first contact — re-query instead of failing.
      const { data: retry } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('seller_id', sellerId)
        .eq('product_id', productId)
        .maybeSingle();
      if (!retry) {
        console.error('[messages] conversation create error:', error.message);
        return { error: 'Could not start the conversation. Please try again.' };
      }
      conversationId = (retry as { id: string }).id;
    }
  }

  if (!conversationId) {
    return { error: 'Could not start the conversation. Please try again.' };
  }

  const body = sanitizeMessage(String(formData.get('body') ?? ''));
  if (body) {
    const result = await sendMessageToConversation(conversationId, null, (() => {
      const fd = new FormData();
      fd.set('body', body);
      return fd;
    })());
    if (result.error) return { conversationId, error: result.error };
  }

  revalidatePath('/buyer/messages');
  return { success: true, conversationId };
}
