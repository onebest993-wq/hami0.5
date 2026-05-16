import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator';
import { getCommunityReports, dismissCommunityReport, deleteCommunityPost, getCommunityPosts } from '@/app/services/lawyer-cloud';
import { UserRole } from '@/app/types/admin-types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function getRoleFromToken(userToken: string): UserRole | null {
  try {
    const parts = userToken.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const role = decoded?.role || decoded?.app_metadata?.role || decoded?.user_metadata?.role || null;
    if (role === UserRole.SUPER_ADMIN || role === UserRole.MODERATOR) return role;
    return null;
  } catch {
    return null;
  }
}

function canManageReports(userToken: string): boolean {
  const role = getRoleFromToken(userToken);
  return role === UserRole.SUPER_ADMIN || role === UserRole.MODERATOR;
}

export async function GET(request: Request): Promise<Response> {
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

    if (!canManageReports(userToken)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'غير مصرح لك بالاطلاع على البلاغات' }),
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    const reports = await getCommunityReports();
    const pending = reports.filter((r) => r.status === 'pending');

    const posts = await getCommunityPosts();
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
      return wifeUnauthorizedResponse();
    }
    if (!(await verifyWifeSignature(request, userToken))) {
      return wifeForbiddenResponse();
    }

    const requesterId = await getVerifiedTokenSubject(userToken);
    if (!requesterId) {
      return wifeUnauthorizedResponse();
    }

    if (!canManageReports(userToken)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'غير مصرح لك بإدارة البلاغات' }),
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    const userRole = getRoleFromToken(userToken);

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
      await dismissCommunityReport(payload.reportId, requesterId);
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
      await deleteCommunityPost(payload.postId, requesterId, userRole ?? UserRole.SUPER_ADMIN);

      if (typeof payload.reportId === 'string' && payload.reportId.trim()) {
        await dismissCommunityReport(payload.reportId, requesterId);
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
