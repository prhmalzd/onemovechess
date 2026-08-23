import { createClient } from '@supabase/supabase-js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

const supabaseAuth = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

declare module 'fastify' {
  interface FastifyRequest {
    playerId: string;
  }
}

export async function requirePlayer(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authorization = request.headers.authorization;
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!accessToken) {
    await reply.code(401).send({ message: 'A Supabase access token is required.' });
    return;
  }

  const { data, error } = await supabaseAuth.auth.getUser(accessToken);
  if (error || !data.user) {
    await reply.code(401).send({ message: 'Your Supabase session is invalid or has expired.' });
    return;
  }

  request.playerId = data.user.id;
}
