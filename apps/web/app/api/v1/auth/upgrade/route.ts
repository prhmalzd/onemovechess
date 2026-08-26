import { jsonError, ApiError, readJson } from '../../../../../server/api';
import { requireAnonymousPlayer } from '../../../../../server/auth/require-player';
import { createSupabaseAdminClient } from '../../../../../server/auth/supabase-admin';
import { prisma } from '../../../../../server/database/prisma';
import { accountUpgradeBody } from '../../../../../server/games/schemas';
import { usernameLoginEmail } from '../../../../../src/shared/auth/username-credentials';

export const runtime = 'nodejs';

function isDuplicateUsernameError(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes('already registered')
    || normalizedMessage.includes('already exists')
    || normalizedMessage.includes('duplicate')
    || normalizedMessage.includes('unique');
}

export async function POST(request: Request): Promise<Response> {
  try {
    const [playerId, body] = await Promise.all([requireAnonymousPlayer(request), readJson(request)]);
    const { username, password } = accountUpgradeBody.parse(body);
    const email = usernameLoginEmail(username);
    const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(playerId, {
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name: username },
    });

    if (error) {
      if (isDuplicateUsernameError(error.message)) throw new ApiError('That username is already taken.', 409);
      throw new ApiError('Your account could not be created. Please try again.', 502);
    }

    await prisma.player.upsert({
      where: { id: playerId },
      create: { id: playerId, displayName: username },
      update: { displayName: username },
    });
    return Response.json({ username });
  } catch (error) { return jsonError(error); }
}
