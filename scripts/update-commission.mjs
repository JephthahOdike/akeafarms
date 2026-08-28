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
  // Update the default commission rate (seller_id=NULL, category_id=NULL) from 5% to 15%
  const { data: existing, error: fetchErr } = await supabase
    .from('commission_rates')
    .select('id, percentage')
    .is('seller_id', null)
    .is('category_id', null)
    .maybeSingle();

  if (fetchErr) {
    console.error('Fetch error:', fetchErr.message);
    process.exit(1);
  }

  if (!existing) {
    // No row exists — insert default at 15%
    const { error: insertErr } = await supabase
      .from('commission_rates')
      .insert({ seller_id: null, category_id: null, percentage: 15.00 });

    if (insertErr) {
      console.error('Insert error:', insertErr.message);
      process.exit(1);
    }
    console.log('Inserted default commission rate: 15%');
  } else {
    console.log(`Current default rate: ${existing.percentage}%`);
    if (existing.percentage === 15) {
      console.log('Already at 15%. No change needed.');
    } else {
      const { error: updateErr } = await supabase
        .from('commission_rates')
        .update({ percentage: 15.00 })
        .eq('id', existing.id);

      if (updateErr) {
        console.error('Update error:', updateErr.message);
        process.exit(1);
      }
      console.log(`Updated default commission rate: ${existing.percentage}% → 15%`);
    }
  }
}

main();
