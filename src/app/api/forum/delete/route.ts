import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator';
import { sanitizePayload } from '../../security/sanitizer';
import { deleteCommunityPost, getCommunityPosts } from '@/app/services/lawyer-cloud';
import { UserRole } from '@/app/types/admin-types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
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

    const jwtPayload = decodeJwtPayload(userToken);
    const isAdmin = jwtPayload?.role === UserRole.SUPER_ADMIN ||
      (jwtPayload?.app_metadata as Record<string, unknown> | undefined)?.role === UserRole.SUPER_ADMIN ||
      (jwtPayload?.user_metadata as Record<string, unknown> | undefined)?.role === UserRole.SUPER_ADMIN;

    let payload: unknown = null;
    try {
      payload = sanitizePayload(await request.json());
    } catch {
      payload = null;
    }

    if (!isRecord(payload) || typeof payload.postId !== 'string' || !payload.postId.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: 'postId مطلوب' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    if (!isAdmin) {
      const posts = await getCommunityPosts();
      const post = posts.find((p) => p.id === payload.postId);
      if (!post) {
        return new Response(
          JSON.stringify({ ok: false, error: 'المنشور غير موجود' }),
          { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
        );
      }
      if (post.authorId !== requesterId) {
        return new Response(
          JSON.stringify({ ok: false, error: 'غير مصرح لك بحذف هذا المنشور' }),
          { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
        );
      }
    }

    await deleteCommunityPost(payload.postId, requesterId, isAdmin ? UserRole.SUPER_ADMIN : undefined, isAdmin ? undefined : undefined);

    return new Response(
      JSON.stringify({ ok: true, action: 'forum_delete', postId: payload.postId }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
