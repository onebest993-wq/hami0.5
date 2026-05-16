import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator';
import { sanitizePayload } from '../../security/sanitizer';
import { reportCommunityPost } from '@/app/services/lawyer-cloud';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
      return wifeUnauthorizedResponse();
    }
    if (!(await verifyWifeSignature(request, userToken))) {
      return wifeForbiddenResponse();
    }

    const requesterId = await getVerifiedTokenSubject(userToken);
    if (!requesterId) {
      return wifeUnauthorizedResponse();
    }

    let payload: unknown = null;
    try {
      payload = sanitizePayload(await request.json());
    } catch {
      payload = null;
    }

    if (
      !isRecord(payload) ||
      typeof payload.postId !== 'string' ||
      !payload.postId.trim() ||
      typeof payload.reason !== 'string' ||
      !payload.reason.trim()
    ) {
      return new Response(
        JSON.stringify({ ok: false, error: 'postId و reason مطلوبان' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    const result = await reportCommunityPost(payload.postId, payload.reason, requesterId);

    return new Response(
      JSON.stringify({ ok: true, action: 'forum_report', result }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
