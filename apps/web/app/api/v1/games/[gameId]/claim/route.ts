import { jsonError } from '../../../../../../server/api';
import { requireAuthenticatedUser } from '../../../../../../server/auth/require-player';
import { gamesService } from '../../../../../../server/games/games.service';
import { gameIdParams } from '../../../../../../server/games/schemas';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ gameId: string }> }): Promise<Response> {
  try {
    const [user, { gameId }] = await Promise.all([requireAuthenticatedUser(request), context.params]);
    return Response.json(await gamesService.claimSpecificGame(user.id, gameIdParams.parse({ gameId }).gameId, { isAnonymous: user.is_anonymous === true }));
  } catch (error) { return jsonError(error); }
}
