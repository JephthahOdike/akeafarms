#!/usr/bin/env node
/**
 * scripts/seed-demo.mjs
 *
 * Creates a demo seller + store + a few products so the marketplace
 * has something to display. Idempotent — safe to re-run.
 *
 * Usage:  pnpm tsx scripts/seed-demo.mjs
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DEMO_SELLER_EMAIL = 'demo-seller@akeafarms.test';
const DEMO_BUYER_EMAIL = 'demo-buyer@akeafarms.test';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'akeafarms-demo-2026';

async function ensureUser(email) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true
  });
  if (error && !error.message.includes('already')) throw error;
  const userId = data?.user?.id;
  if (!userId) {
    const { data: listed } = await supabase.auth.admin.listUsers();
    userId = listed.users.find((u) => u.email === email)?.id;
  }
  return userId;
}

const sellerId = await ensureUser(DEMO_SELLER_EMAIL);
const buyerId = await ensureUser(DEMO_BUYER_EMAIL);
console.log('Demo users ready.');

// Promote seller + create store
await supabase
  .from('profiles')
  .update({ role: 'seller', full_name: 'Adesina Farms' })
  .eq('id', sellerId);

const { data: existingSeller } = await supabase
  .from('seller_profiles')
  .select('id, stores(id, slug)')
  .eq('user_id', sellerId)
  .maybeSingle();

let storeId = Array.isArray(existingSeller?.stores)
  ? existingSeller.stores[0]?.id
  : existingSeller?.stores?.id;

if (!existingSeller) {
  const { data: sp, error: spErr } = await supabase
    .from('seller_profiles')
    .insert({
      user_id: sellerId,
      business_name: 'Adesina Farms Ltd.',
      business_type: 'Farmer',
      bio: 'A multi-generation farm in Oyo State producing premium grains and tubers.',
      years_of_experience: 15,
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .select('id')
    .single();
  if (spErr) throw spErr;
  const { data: store, error: sErr } = await supabase
    .from('stores')
    .insert({
      seller_id: sp.id,
      name: 'Adesina Farms',
      slug: 'adesina-farms',
      description:
        'Premium rice, yam, cassava and palm oil, harvested fresh from Oyo State.',
      farm_name: 'Adesina Family Farm',
      farm_state: 'Oyo',
      farm_lga: 'Iseyin',
      farm_location: 'Iseyin, Oyo State, Nigeria',
      organic_certified: true,
      verification_status: 'approved'
    })
    .select('id')
    .single();
  if (sErr) throw sErr;
  storeId = store.id;

  await supabase.from('seller_wallets').insert({ seller_id: sp.id });
  console.log('Created seller profile + store.');
}

if (!storeId) {
  console.log('Store already exists.');
} else {
  // Pick a few categories
  const { data: cats } = await supabase
    .from('categories')
    .select('id, slug')
    .in('slug', ['grains-cereals', 'tubers-roots', 'vegetables']);

  const products = [
    {
      name: 'Premium Ofada Rice',
      slug: 'premium-ofada-rice',
      description:
        'Stone-free, unpolished Ofada rice with the distinctive earthy aroma. 50kg bag.',
      price: 38000,
      unit: 'bag',
      weight_kg: 50,
      packaging_info: 'Woven polypropylene sack',
      quality_grade: 'premium',
      organic: true,
      harvest_date: new Date().toISOString().slice(0, 10),
      category_id: cats?.find((c) => c.slug === 'grains-cereals')?.id,
      is_featured: true
    },
    {
      name: 'Fresh Yam Tubers',
      slug: 'fresh-yam-tubers',
      description:
        'Pona yam tubers, harvested this week. Sold per tuber, average 2–3 kg.',
      price: 4500,
      unit: 'piece',
      weight_kg: 2.5,
      packaging_info: 'Wrapped in banana leaves',
      quality_grade: 'A',
      organic: true,
      harvest_date: new Date().toISOString().slice(0, 10),
      category_id: cats?.find((c) => c.slug === 'tubers-roots')?.id,
      is_featured: true
    },
    {
      name: 'Red Palm Oil',
      slug: 'red-palm-oil',
      description:
        'Traditional cold-pressed palm oil from locally-grown tenera palms. 25-litre keg.',
      price: 22000,
      unit: 'litre',
      weight_kg: 25,
      packaging_info: 'Food-grade plastic keg',
      quality_grade: 'A',
      organic: true,
      category_id: cats?.find((c) => c.slug === 'vegetables')?.id,
      is_featured: true
    }
  ];

  for (const p of products) {
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('store_id', storeId)
      .eq('slug', p.slug)
      .maybeSingle();
    if (existing) continue;
    const { data: created, error: pErr } = await supabase
      .from('products')
      .insert({ ...p, store_id: storeId, status: 'active' })
      .select('id')
      .single();
    if (pErr) {
      console.warn(`Skip ${p.name}: ${pErr.message}`);
      continue;
    }
    await supabase.from('inventory').insert({
      product_id: created.id,
      quantity_available: 100
    });
  }
  console.log('Demo products seeded.');
}

console.log(`\nCredentials:
  Seller: ${DEMO_SELLER_EMAIL} / ${DEMO_PASSWORD}
  Buyer:  ${DEMO_BUYER_EMAIL}  / ${DEMO_PASSWORD}
`);
