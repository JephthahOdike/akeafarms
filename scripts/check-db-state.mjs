import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const admin = createClient(URL, SRK, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anonClient = createClient(URL, ANON, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Keys that must NEVER appear in anonymous responses.
const SENSITIVE_KEYS = [
  'bank_account_number',
  'bank_name',
  'bank_code',
  'cac_number',
  'cac_document_url',
  'tin',
  'id_document_url',
];

// SECURITY: never print raw values — mask account-like strings.
function maskAccount(value) {
  if (!value) return null;
  const s = String(value);
  return `••••${s.slice(-4)} (len ${s.length})`;
}

async function openApiPaths() {
  const res = await fetch(`${URL}/rest/v1/`, {
    headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
  });
  if (!res.ok) return null;
  const spec = await res.json();
  return spec?.paths ?? null;
}

async function main() {
  console.log('=== A. Column inventory via PostgREST OpenAPI (service role) ===');
  const paths = await openApiPaths();
  if (!paths) {
    console.log('OpenAPI root unavailable');
  } else {
    for (const t of ['seller_profiles', 'orders', 'order_items', 'payments']) {
      const def = paths[`/${t}`]?.get?.parameters;
      // Columns are better read from definitions; fall back to probing below.
      console.log(`/${t} exposed: ${paths[`/${t}`] ? 'yes' : 'no'}`);
    }
  }

  console.log(
    '\n=== B. Sensitive-table columns via targeted selects (service role) ==='
  );
  // Discover actual bank-related columns on seller_profiles
  const candidates = [
    'bank_account_number',
    'bank_name',
    'bank_code',
    'settlement_bank_name',
    'settlement_bank_code',
    'cac_number',
    'tin',
  ];
  for (const c of candidates) {
    const { error } = await admin
      .from('seller_profiles')
      .select(c)
      .limit(1);
    console.log(
      `seller_profiles.${c}:`,
      error ? 'DOES NOT EXIST' : 'exists'
    );
  }

  console.log('\n=== C. ANON exposure matrix (RLS live test) ===');
  const tables = [
    'seller_profiles',
    'stores',
    'orders',
    'order_items',
    'seller_wallets',
    'wallet_transactions',
    'settlements',
    'tracking_events',
    'audit_logs',
    'profiles',
    'commission_rates',
  ];
  for (const t of tables) {
    const { data, error } = await anonClient.from(t).select('*').limit(2);
    if (error) {
      console.log(`anon ${t}: DENIED/ERROR -> ${error.message}`);
      continue;
    }
    const n = Array.isArray(data) ? data.length : 0;
    let leakKeys = [];
    if (n > 0) {
      const sample = data[0];
      leakKeys = Object.keys(sample).filter((k) =>
        SENSITIVE_KEYS.some((s) => k.includes(s))
      );
    }
    console.log(
      `anon ${t}: returned ${n} row(s)` +
        (n > 0
          ? ` | columns include sensitive: ${leakKeys.length ? leakKeys.join(', ') : 'none'}`
          : '')
    );
  }

  console.log('\n=== D. RPC existence (correct signatures) ===');
  const NIL_UUID = '00000000-0000-0000-0000-000000000000';
  const { error: e1 } = await admin.rpc('get_public_seller_info', {
    seller_profile_id: NIL_UUID,
  });
  console.log(
    'rpc get_public_seller_info(uuid):',
    e1 ? `NOT AVAILABLE: ${e1.message}` : 'OK'
  );
  const { error: e2 } = await admin.rpc('get_public_seller_infos', {
    seller_profile_ids: [NIL_UUID],
  });
  console.log(
    'rpc get_public_seller_infos(uuid[]):',
    e2 ? `NOT AVAILABLE: ${e2.message}` : 'OK'
  );

  console.log('\n=== E. seller_profiles sample (MASKED) ===');
  const { data: sp, error: spErr } = await admin
    .from('seller_profiles')
    .select('id, user_id, business_name, status')
    .limit(3);
  console.log(
    'seller_profiles:',
    spErr ? spErr.message : JSON.stringify(sp, null, 2)
  );

  console.log('\n=== F. Migration-history table (if accessible) ===');
  const { data: mh, error: mhErr } = await admin
    .from('supabase_migrations.schema_migrations')
    .select('*')
    .limit(100);
  console.log(
    'supabase_migrations.schema_migrations:',
    mhErr ? `not readable via REST (${mhErr.message})` : JSON.stringify(mh)
  );
}

main();
