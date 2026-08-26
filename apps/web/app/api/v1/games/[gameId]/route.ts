import { jsonError } from '../../../../../server/api';
import { requirePlayer } from '../../../../../server/auth/require-player';
import { gamesService } from '../../../../../server/games/games.service';
import { gameIdParams } from '../../../../../server/games/schemas';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ gameId: string }> }): Promise<Response> {
  try {
    await requirePlayer(request);
    const { gameId } = gameIdParams.parse(await params);
    return Response.json(await gamesService.getGame(gameId));
  } catch (error) { return jsonError(error); }
}
