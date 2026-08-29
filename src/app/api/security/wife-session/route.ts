import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import {
  buildCsrfClearCookie,
  isSecureRequest,
} from '../../security/csrfCookie.ts';
import { invalidateCsrfForSubject } from '../../security/csrfServerStore.ts';
import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { invalidateWifeSession } from '../../security/wifeSessionServerStore.ts';
import { assertSameOriginRequest } from '../../security/wifeSameOrigin.ts';

/**
 * CSRF bootstrap lives at GET /api/security/csrf (WIFE-signed GET; CSRF skipped on GET).
 * This path no longer issues CSRF or a client signing secret.
 */
export async function GET(_request: Request): Promise<Response> {
  return applyWifeSecurityHeaders(
    new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Allow: 'DELETE',
      },
    }),
  );
}

export async function DELETE(request: Request): Promise<Response> {
  if (!assertSameOriginRequest(request)) {
    return applyWifeSecurityHeaders(
      new Response(JSON.stringify({ ok: false, error: 'Forbidden origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    );
  }

  const authGate = unwrapWifeUser(await requireWifeUser(request));
  if ('response' in authGate) return authGate.response;
  const { userId: subject } = authGate;

  const sessionId =
    request.headers.get('x-wife-session')?.trim() ?? request.headers.get('X-WIFE-Session')?.trim() ?? '';
  if (sessionId) {
    await invalidateWifeSession(sessionId);
  }
  await invalidateCsrfForSubject(subject);

  return applyWifeSecurityHeaders(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': buildCsrfClearCookie(isSecureRequest(request)),
      },
    }),
  );
}
