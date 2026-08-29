import {
  extractUserTokenFromRequest,
  getVerifiedTokenIdentity,
  verifyWifeSignatureStatus,
  wifeRateLimitedResponse,
  wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
  wifeAccountLockedResponse,
  wifeAccountFrozenResponse,
} from './wifeValidator.ts';
import { getWifeUserRestrictionLive } from './wifeUserStatus.ts';
import { accountFrozenUserMessage, accountLoginDeniedPayload, formatAccountUntilLabel } from './accountRestrictionCopy.ts';
import { isPlatformAdminUserId } from './roleResolver.ts';

export type WifeAuthOk = { ok: true; userId: string };
export type WifeAuthFail = { ok: false; response: Response };
export type WifeAuthResult = WifeAuthOk | WifeAuthFail;

export type RequireWifeUserOptions = {
  /** بوابة الشبكة تحتاج هوية صالحة حتى تعيد رسالة القفل لا 401 عام */
  allowLoginLocked?: boolean;
  /** الكتابة السحابية/المزامنة — التجميد يوقفها مع بقاء صندوق الإشعارات */
  rejectFrozen?: boolean;
};

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

export async function requireWifeUser(
  request: Request,
  options: RequireWifeUserOptions = {},
): Promise<WifeAuthResult> {
  const userToken = extractUserTokenFromRequest(request);
  if (!userToken) {
    return {
      ok: false as const,
      response: wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' }),
    };
  }
  const userId = await getVerifiedTokenIdentity(userToken);
  if (!userId) {
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
  if (!(await isPlatformAdminUserId(userId))) {
    const restriction = await getWifeUserRestrictionLive(userId);
    if (!options.allowLoginLocked && !restriction.loginAllowed) {
      const denied = accountLoginDeniedPayload(restriction);
      return {
        ok: false as const,
        response: wifeAccountLockedResponse({
          request,
          reason: 'account_locked',
          userId,
          message: denied.error,
        }),
      };
    }
    if (options.rejectFrozen && restriction.frozen) {
      const until = formatAccountUntilLabel(restriction.freezeUntil);
      return {
        ok: false as const,
        response: wifeAccountFrozenResponse({
          request,
          reason: 'account_frozen',
          userId,
          message: accountFrozenUserMessage(until || undefined),
        }),
      };
    }
  }
  return { ok: true as const, userId };
}

/** كتابة سحابية — التجميد يُرفض هنا؛ صندوق الإشعارات يبقى عبر requireWifeUser. */
export async function requireWifeCloudWrite(request: Request): Promise<WifeAuthResult> {
  return requireWifeUser(request, { rejectFrozen: true });
}
