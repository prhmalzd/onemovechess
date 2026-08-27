import { createCaptchaChallenge } from '../../../../../server/auth/captcha';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return Response.json(createCaptchaChallenge());
}
