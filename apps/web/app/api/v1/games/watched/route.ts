import { jsonError } from '../../../../../server/api';
import { requireRegisteredPlayer } from '../../../../../server/auth/require-player';
import { gamesService } from '../../../../../server/games/games.service';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  try { return Response.json(await gamesService.getWatchedBoards(await requireRegisteredPlayer(request))); }
  catch (error) { return jsonError(error); }
}
