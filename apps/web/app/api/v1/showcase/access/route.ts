import { ApiError, jsonError } from '../../../../../server/api';
import { requireAuthenticatedUser } from '../../../../../server/auth/require-player';
import { usernameLoginEmail } from '../../../../../src/shared/auth/username-credentials';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuthenticatedUser(request);
    if (user.email !== usernameLoginEmail('parham')) throw new ApiError('This preview is only available to its owner.', 403);
    return Response.json({ allowed: true });
  } catch (error) { return jsonError(error); }
}
