import { fetchGoTrueUser } from '../auth/goTrueSession.ts';
import { extractUserTokenFromRequest } from './wifeRequestToken.ts';
import { isPlatformAdminUserId } from './roleResolver.ts';

async function readLiveEmailFromAccessToken(userToken: string | null | undefined): Promise<string | null> {
  const token = userToken?.trim();
  if (!token) return null;
  const user = await fetchGoTrueUser(token);
  return typeof user?.email === 'string' ? user.email : null;
}

export async function isAdminUserId(userId: string, userToken?: string | null): Promise<boolean> {
  const liveEmail = await readLiveEmailFromAccessToken(userToken);
  return isPlatformAdminUserId(userId, liveEmail);
}

export async function isAdminRequest(request: Request, userId: string): Promise<boolean> {
  return isAdminUserId(userId, extractUserTokenFromRequest(request));
}
