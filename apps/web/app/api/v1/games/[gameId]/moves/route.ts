import { jsonError, readJson } from '../../../../../../server/api';
import { requirePlayer } from '../../../../../../server/auth/require-player';
import { gamesService } from '../../../../../../server/games/games.service';
import { gameIdParams, moveBody } from '../../../../../../server/games/schemas';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ gameId: string }> }): Promise<Response> {
  try {
    const [playerId, routeParams, body] = await Promise.all([requirePlayer(request), params, readJson(request)]);
    const { gameId } = gameIdParams.parse(routeParams);
    return Response.json(await gamesService.submitMove({ gameId, playerId, ...moveBody.parse(body) }));
  } catch (error) { return jsonError(error); }
}
