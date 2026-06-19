import { isPlatformAdminUserId } from './roleResolver.ts';

export async function isAdminUserId(userId: string, _userToken?: string | null): Promise<boolean> {
  void _userToken;
  return isPlatformAdminUserId(userId);
}

export async function isAdminRequest(request: Request, userId: string): Promise<boolean> {
  void request;
  return isPlatformAdminUserId(userId);
}
