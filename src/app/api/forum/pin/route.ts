import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator';
import { sanitizePayload } from '../../security/sanitizer';
import { CommunityDB, type CommunityPost } from '@/app/services/lawyer-cloud';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isAdmin(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const role = (payload as Record<string, unknown>).role;
  const appMeta = payload.app_metadata as Record<string, unknown> | undefined;
  const userMeta = payload.user_metadata as Record<string, unknown> | undefined;
  return role === 'SUPER_ADMIN' || appMeta?.role === 'SUPER_ADMIN' || userMeta?.role === 'SUPER_ADMIN';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) return wifeUnauthorizedResponse();
    if (!(await verifyWifeSignature(request, userToken))) return wifeForbiddenResponse();
    if (!isAdmin(userToken)) {
      return new Response(JSON.stringify({ ok: false, error: 'غير مصرح لك' }), {
        status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const payload = sanitizePayload(await request.json());
    if (!isRecord(payload) || typeof payload.postId !== 'string' || typeof payload.pinned !== 'boolean') {
      return new Response(JSON.stringify({ ok: false, error: 'postId و pinned مطلوبان' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const posts = await CommunityDB.listPosts();
    const post = posts.find((p) => p.id === payload.postId);
    if (!post) {
      return new Response(JSON.stringify({ ok: false, error: 'المنشور غير موجود' }), {
        status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const updated: CommunityPost = { ...post, isPinned: payload.pinned, updatedAt: new Date().toISOString() };
    await CommunityDB.savePost(updated);

    return new Response(JSON.stringify({ ok: true, action: 'toggle_pin', postId: payload.postId, pinned: payload.pinned }), {
      status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
