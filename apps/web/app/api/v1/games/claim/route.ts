import { jsonError } from '../../../../../server/api';
import { requireAuthenticatedUser } from '../../../../../server/auth/require-player';
import { gamesService } from '../../../../../server/games/games.service';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuthenticatedUser(request);
    return Response.json(await gamesService.claimPlayableGame(user.id, { isAnonymous: user.is_anonymous === true }));
  }
  catch (error) { return jsonError(error); }
}
