import { z } from 'zod';

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof environmentSchema>;

let cachedEnv: ServerEnv | undefined;

export class ServerConfigurationError extends Error {
  constructor() {
    super('Server configuration is incomplete. Set DATABASE_URL and the NEXT_PUBLIC_SUPABASE_* values before starting the app.');
  }
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) throw new ServerConfigurationError();
  cachedEnv = parsed.data;
  return cachedEnv;
}
