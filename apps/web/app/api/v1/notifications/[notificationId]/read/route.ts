import { jsonError } from '../../../../../../server/api';
import { requireRegisteredPlayer } from '../../../../../../server/auth/require-player';
import { notificationsService } from '../../../../../../server/notifications/notifications.service';
import { z } from 'zod';

export const runtime = 'nodejs';

const notificationParams = z.object({ notificationId: z.string().uuid() });

export async function PATCH(request: Request, { params }: { params: Promise<{ notificationId: string }> }): Promise<Response> {
  try {
    const { notificationId } = notificationParams.parse(await params);
    return Response.json(await notificationsService.markRead(await requireRegisteredPlayer(request), notificationId));
  } catch (error) { return jsonError(error); }
}
