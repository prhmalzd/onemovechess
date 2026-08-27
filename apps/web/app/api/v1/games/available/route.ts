import { jsonError } from '../../../../../server/api';
import { requirePlayer } from '../../../../../server/auth/require-player';
import { gamesService } from '../../../../../server/games/games.service';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  try {
    const offset = Number(new URL(request.url).searchParams.get('offset') ?? '0');
    if (!Number.isSafeInteger(offset) || offset < 0) return Response.json({ message: 'The requested board page is invalid.' }, { status: 400 });
    return Response.json(await gamesService.getAvailableBoards(await requirePlayer(request), offset));
  } catch (error) { return jsonError(error); }
}
