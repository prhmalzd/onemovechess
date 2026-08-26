import { createClient } from '@supabase/supabase-js';
import { ApiError } from '../api';
import { getServerEnv } from '../env';

export async function requirePlayer(request: Request): Promise<string> {
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!accessToken) throw new ApiError('A Supabase access token is required.', 401);

  const env = getServerEnv();
  const supabaseAuth = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabaseAuth.auth.getUser(accessToken);
  if (error || !data.user) throw new ApiError('Your Supabase session is invalid or has expired.', 401);
  return data.user.id;
}
