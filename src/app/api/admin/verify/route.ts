import { isAdminUserId } from '../../security/adminCheck.ts';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { rejectHeadquartersPublicSurface } from '../../security/headquartersOriginGate.ts';
import { assertSameOriginRequest } from '../../security/wifeSameOrigin.ts';

export const runtime = 'nodejs';

/**
 * تحقق هوية مقر القيادة من جلسة HttpOnly — مثل /api/auth/session.
 * لا يُطلب توقيع WIFE: طبقة التوقيع كانت ترفض مدير المنصّة قبل فحص البريد.
 * الرد دائماً { ok, isAdmin } فقط — لا userId ولا سبب الصلاحية في أي بيئة.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const surface = rejectHeadquartersPublicSurface(request);
    if (surface) return surface;
    if (!assertSameOriginRequest(request)) {
      return wifeJsonResponse(403, { ok: false, error: 'Forbidden origin' });
    }
    const token = extractUserTokenFromRequest(request);
    if (!token) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }

    const userId = await getVerifiedTokenSubject(token);
    if (!userId) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }

    const isAdmin = await isAdminUserId(userId, token);
    return wifeJsonResponse(200, { ok: true, isAdmin });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal admin verify error' });
  }
}
