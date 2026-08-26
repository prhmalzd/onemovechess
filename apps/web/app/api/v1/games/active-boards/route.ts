import { jsonError } from '../../../../../server/api';
import { requirePlayer } from '../../../../../server/auth/require-player';
import { gamesService } from '../../../../../server/games/games.service';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  try { return Response.json(await gamesService.getActiveBoards(await requirePlayer(request))); }
  catch (error) { return jsonError(error); }
}
