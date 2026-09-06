import { after } from 'next/server';
import { jsonError } from '../../../../../../server/api';
import { requireRegisteredPlayer } from '../../../../../../server/auth/require-player';
import { gameIdParams } from '../../../../../../server/games/schemas';
import { analysisService } from '../../../../../../server/analysis/analysis.service';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ gameId: string }> }): Promise<Response> {
  try { const { gameId } = gameIdParams.parse(await params); const analysis = await analysisService.request(gameId, await requireRegisteredPlayer(request)); after(() => analysisService.run(analysis.id)); return Response.json({ analysisId: analysis.id, status: analysis.status }); }
  catch (error) { return jsonError(error); }
}
