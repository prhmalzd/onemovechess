import { z } from 'zod';

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof environmentSchema>;

let cachedEnv: ServerEnv | undefined;

export class ServerConfigurationError extends Error {
  constructor(message = 'Server configuration is incomplete. Set DATABASE_URL and the NEXT_PUBLIC_SUPABASE_* values before starting the app.') {
    super(message);
  }
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) throw new ServerConfigurationError();
  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getSupabaseServiceRoleKey(): string {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new ServerConfigurationError('Server configuration is incomplete. Set SUPABASE_SERVICE_ROLE_KEY before creating username accounts.');
  }
  return serviceRoleKey;
}
