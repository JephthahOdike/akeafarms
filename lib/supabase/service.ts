import { createClient as createBaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client.
 * ⚠️  NEVER import this from client components.
 * Bypasses RLS — use only in trusted server contexts
 * (webhooks, admin jobs, seed scripts).
 */
export function createServiceClient() {
  return createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
