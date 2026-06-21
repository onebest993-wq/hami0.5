import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignatureStatus,
  wifeRateLimitedResponse,
  wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from './wifeValidator.ts';

export type WifeAuthOk = { ok: true; userId: string };
export type WifeAuthFail = { ok: false; response: Response };
export type WifeAuthResult = WifeAuthOk | WifeAuthFail;

export function wifeAuthDenied(auth: WifeAuthResult): Response | null {
  if (auth.ok === false) return auth.response;
  return null;
}

/** بعد فحص wifeAuthDenied — يُرجع userId أو Response للإرجاع المباشر. */
export function unwrapWifeUser(
  auth: WifeAuthResult,
): { userId: string } | { response: Response } {
  if (auth.ok === false) return { response: auth.response };
  return { userId: auth.userId };
}

export async function requireWifeUser(request: Request): Promise<WifeAuthResult> {
  const userToken = extractUserTokenFromRequest(request);
  if (!userToken || !(await isTokenAuthorized(userToken))) {
    return {
      ok: false as const,
      response: wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' }),
    };
  }
  const signatureStatus = await verifyWifeSignatureStatus(request, userToken);
  if (signatureStatus === 'rate_limited') {
    return {
      ok: false as const,
      response: wifeRateLimitedResponse({ request, reason: 'rate_limited' }),
    };
  }
  if (signatureStatus !== 'valid') {
    return {
      ok: false as const,
      response: wifeSignatureFailedResponse(request),
    };
  }
  const userId = await getVerifiedTokenSubject(userToken);
  if (!userId) {
    return {
      ok: false as const,
      response: wifeUnauthorizedResponse({ request, reason: 'subject_missing' }),
    };
  }
  return { ok: true as const, userId };
}
