import { jsonError, readJson } from '../../../../../server/api';
import { requirePlayer } from '../../../../../server/auth/require-player';
import { prisma } from '../../../../../server/database/prisma';
import { playerProfileBody } from '../../../../../server/games/schemas';

export const runtime = 'nodejs';

export async function PATCH(request: Request): Promise<Response> {
  try {
    const [playerId, body] = await Promise.all([requirePlayer(request), readJson(request)]);
    const { displayName } = playerProfileBody.parse(body);
    const player = await prisma.player.upsert({
      where: { id: playerId },
      create: { id: playerId, displayName },
      update: { displayName },
      select: { displayName: true },
    });
    return Response.json(player);
  } catch (error) { return jsonError(error); }
}
