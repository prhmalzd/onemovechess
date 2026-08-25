import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the Vercel Production environment (or apps/web/.env.local for local development).',
  );
}

/**
 * Browser-safe Supabase client. This intentionally uses only the publishable
 * key; database writes will remain the responsibility of the future Fastify API.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
