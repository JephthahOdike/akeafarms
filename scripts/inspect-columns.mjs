import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: sp, error: spErr } = await supabase.from('seller_profiles').select('*').limit(1);
  console.log('seller_profiles columns:', spErr ? `ERROR ${spErr.message}` : (sp?.[0] ? Object.keys(sp[0]) : '(no rows)'));

  const { data: st, error: stErr } = await supabase.from('stores').select('*').limit(1);
  console.log('stores columns:', stErr ? `ERROR ${stErr.message}` : (st?.[0] ? Object.keys(st[0]) : '(no rows)'));
}

main();
