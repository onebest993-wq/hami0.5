import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse,
  wifeUnauthorizedResponse,
} from './wifeValidator.ts';

export async function requireWifeUser(
  request: Request,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const userToken = extractUserTokenFromRequest(request);
  if (!userToken || !(await isTokenAuthorized(userToken))) {
    return {
      ok: false,
      response: wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' }),
    };
  }
  if (!(await verifyWifeSignature(request, userToken))) {
    return {
      ok: false,
      response: wifeForbiddenResponse({ request, reason: 'signature_failed' }),
    };
  }
  const userId = await getVerifiedTokenSubject(userToken);
  if (!userId) {
    return {
      ok: false,
      response: wifeUnauthorizedResponse({ request, reason: 'subject_missing' }),
    };
  }
  return { ok: true, userId };
}
