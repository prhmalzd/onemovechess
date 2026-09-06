import { jsonError } from '../../../../../../server/api';
import { requireRegisteredPlayer } from '../../../../../../server/auth/require-player';
import { gameIdParams } from '../../../../../../server/games/schemas';
import { analysisService } from '../../../../../../server/analysis/analysis.service';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ gameId: string }> }): Promise<Response> {
  try { const { gameId } = gameIdParams.parse(await params); return Response.json(await analysisService.get(gameId, await requireRegisteredPlayer(request))); }
  catch (error) { return jsonError(error); }
}
