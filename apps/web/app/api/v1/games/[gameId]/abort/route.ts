import { jsonError } from '../../../../../../server/api';
import { requirePlayer } from '../../../../../../server/auth/require-player';
import { gamesService } from '../../../../../../server/games/games.service';
import { gameIdParams } from '../../../../../../server/games/schemas';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ gameId: string }> }): Promise<Response> {
  try {
    const [playerId, routeParams] = await Promise.all([requirePlayer(request), params]);
    const { gameId } = gameIdParams.parse(routeParams);
    await gamesService.abortFirstMoveGame(gameId, playerId);
    return new Response(null, { status: 204 });
  } catch (error) { return jsonError(error); }
}
