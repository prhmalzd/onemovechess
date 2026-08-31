import { createClient, type User } from '@supabase/supabase-js';
import { ApiError } from '../api';
import { getServerEnv } from '../env';

export async function requireAuthenticatedUser(request: Request): Promise<User> {
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!accessToken) throw new ApiError('A Supabase access token is required.', 401);

  const env = getServerEnv();
  const supabaseAuth = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabaseAuth.auth.getUser(accessToken);
  if (error || !data.user) throw new ApiError('Your Supabase session is invalid or has expired.', 401);
  return data.user;
}

export async function requirePlayer(request: Request): Promise<string> {
  return (await requireAuthenticatedUser(request)).id;
}

export async function requireRegisteredPlayer(request: Request): Promise<string> {
  const user = await requireAuthenticatedUser(request);
  if (user.is_anonymous) throw new ApiError('Create an account to watch boards.', 403);
  return user.id;
}

export async function requireAnonymousPlayer(request: Request): Promise<string> {
  const user = await requireAuthenticatedUser(request);
  if (!user.is_anonymous) throw new ApiError('This account has already been created.', 409);
  return user.id;
}
