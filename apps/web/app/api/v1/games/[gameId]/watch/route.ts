import { jsonError } from '../../../../../../server/api';
import { requireRegisteredPlayer } from '../../../../../../server/auth/require-player';
import { gamesService } from '../../../../../../server/games/games.service';
import { gameIdParams } from '../../../../../../server/games/schemas';

export const runtime = 'nodejs';

export async function PUT(request: Request, { params }: { params: Promise<{ gameId: string }> }): Promise<Response> {
  try {
    const { gameId } = gameIdParams.parse(await params);
    return Response.json(await gamesService.setBoardWatch(await requireRegisteredPlayer(request), gameId, true));
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ gameId: string }> }): Promise<Response> {
  try {
    const { gameId } = gameIdParams.parse(await params);
    return Response.json(await gamesService.setBoardWatch(await requireRegisteredPlayer(request), gameId, false));
  } catch (error) { return jsonError(error); }
}
