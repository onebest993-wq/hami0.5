import { applyWifeSecurityHeaders } from './wifeSecurityHeaders.ts';
import { recordWifeRejection, type WifeRejectMeta } from './wifeSecurityMonitor.ts';
import { ACCOUNT_LOCKED_CODE, ACCOUNT_FROZEN_CODE, accountLoginLockedUserMessage, accountFrozenUserMessage } from './accountRestrictionCopy.ts';

export function wifeForbiddenResponse(meta?: WifeRejectMeta): Response {
  if (meta) recordWifeRejection(meta);
  return applyWifeSecurityHeaders(
    new Response(JSON.stringify({ ok: false, error: 'Cryptographic verification failed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  );
}

export function wifeUnauthorizedResponse(meta?: WifeRejectMeta): Response {
  if (meta) recordWifeRejection(meta);
  return applyWifeSecurityHeaders(
    new Response(JSON.stringify({ ok: false, error: 'Unauthorized user' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  );
}

/** 429: too many WIFE-verified requests (distinct from signature failure). */
export function wifeRateLimitedResponse(meta?: WifeRejectMeta): Response {
  if (meta) recordWifeRejection(meta);
  return applyWifeSecurityHeaders(
    new Response(
      JSON.stringify({
        ok: false,
        error: 'Too many requests',
        code: 'WIFE_RATE_LIMITED',
        message: 'تم تجاوز حد الطلبات. انتظر قليلاً ثم أعد المحاولة.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': '60',
        },
      },
    ),
  );
}

export function wifeSignatureFailedResponse(request: Request): Response {
  return wifeForbiddenResponse({ request, reason: 'signature_failed' });
}

export function wifeAccountLockedResponse(meta: WifeRejectMeta & { message?: string }): Response {
  const message = meta.message?.trim() || accountLoginLockedUserMessage();
  recordWifeRejection({
    request: meta.request,
    reason: 'account_locked',
    userId: meta.userId,
    detail: meta.detail,
  });
  return applyWifeSecurityHeaders(
    new Response(
      JSON.stringify({
        ok: false,
        error: message,
        code: ACCOUNT_LOCKED_CODE,
        message,
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    ),
  );
}

export function wifeAccountFrozenResponse(meta: WifeRejectMeta & { message?: string }): Response {
  const message = meta.message?.trim() || accountFrozenUserMessage();
  recordWifeRejection({
    request: meta.request,
    reason: 'account_frozen',
    userId: meta.userId,
    detail: meta.detail,
  });
  return applyWifeSecurityHeaders(
    new Response(
      JSON.stringify({
        ok: false,
        error: message,
        code: ACCOUNT_FROZEN_CODE,
        message,
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    ),
  );
}
