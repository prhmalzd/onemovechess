import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if ((!supabaseUrl || !supabasePublishableKey) && typeof window !== 'undefined') {
  throw new Error(
    'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel (or apps/web/.env.local for local development).',
  );
}

/**
 * Browser-safe Supabase client. It uses only the publishable key.
 */
// The placeholder is used only while Next prerenders pages without browser
// environment variables. The browser branch above still fails fast if config is absent.
export const supabase = createClient(
  supabaseUrl ?? 'https://missing-project.supabase.co',
  supabasePublishableKey ?? 'missing-publishable-key',
);
