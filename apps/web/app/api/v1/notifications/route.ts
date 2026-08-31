import { jsonError } from '../../../../server/api';
import { requireRegisteredPlayer } from '../../../../server/auth/require-player';
import { notificationsService } from '../../../../server/notifications/notifications.service';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  try { return Response.json(await notificationsService.list(await requireRegisteredPlayer(request))); }
  catch (error) { return jsonError(error); }
}
