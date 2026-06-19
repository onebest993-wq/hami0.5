import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse, wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { canManageForumAdmin, getForumRoleForUser } from '../adminAuth.ts';
import { UserRole } from '../../../types/admin-types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export async function GET(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }
    if (!(await verifyWifeSignature(request, userToken))) {
      return wifeSignatureFailedResponse(request);
    }

    const requesterId = await getVerifiedTokenSubject(userToken);
    if (!requesterId) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }

    if (!(await canManageForumAdmin(requesterId))) {
      return new Response(
        JSON.stringify({ ok: false, error: 'غير مصرح لك بالاطلاع على البلاغات' }),
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    const reports = await ForumRepository.listReports();
    const pending = reports.filter((r) => r.status === 'pending');

    const { posts } = await ForumRepository.listPosts(500, 0);
    const reportsWithPost = pending.map((r) => {
      const post = posts.find((p) => p.id === r.postId);
      return { ...r, post: post ?? null };
    });

    return new Response(
      JSON.stringify({ ok: true, reports: reportsWithPost }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }
    if (!(await verifyWifeSignature(request, userToken))) {
      return wifeSignatureFailedResponse(request);
    }

    const requesterId = await getVerifiedTokenSubject(userToken);
    if (!requesterId) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }

    if (!(await canManageForumAdmin(requesterId))) {
      return new Response(
        JSON.stringify({ ok: false, error: 'غير مصرح لك بإدارة البلاغات' }),
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    const userRole = await getForumRoleForUser(requesterId);

    let payload: unknown = null;
    try {
      payload = await request.json();
    } catch {
      payload = null;
    }

    if (!isRecord(payload) || typeof payload.action !== 'string' || !payload.action.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: 'action مطلوب' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    const action = payload.action;

    if (action === 'dismiss') {
      if (typeof payload.reportId !== 'string' || !payload.reportId.trim()) {
        return new Response(
          JSON.stringify({ ok: false, error: 'reportId مطلوب' }),
          { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
        );
      }
      await ForumRepository.dismissReport(payload.reportId, requesterId);
      return new Response(
        JSON.stringify({ ok: true, action: 'report_dismissed', reportId: payload.reportId }),
        { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    if (action === 'delete_post') {
      if (typeof payload.postId !== 'string' || !payload.postId.trim()) {
        return new Response(
          JSON.stringify({ ok: false, error: 'postId مطلوب' }),
          { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
        );
      }
      await ForumRepository.deletePostAuthorized(
        payload.postId,
        requesterId,
        userRole === UserRole.SUPER_ADMIN || userRole === UserRole.MODERATOR,
      );

      if (typeof payload.reportId === 'string' && payload.reportId.trim()) {
        await ForumRepository.dismissReport(payload.reportId, requesterId);
      }

      return new Response(
        JSON.stringify({ ok: true, action: 'post_deleted_via_report', postId: payload.postId }),
        { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: `إجراء غير معروف: ${action}` }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
