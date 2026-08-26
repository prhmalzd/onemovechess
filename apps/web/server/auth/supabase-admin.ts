import { createClient } from '@supabase/supabase-js';
import { getServerEnv, getSupabaseServiceRoleKey } from '../env';

export function createSupabaseAdminClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
