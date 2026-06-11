import {
    extractUserTokenFromRequest,
    getVerifiedTokenSubject,
    isTokenAuthorized,
    verifyWifeSignature,
    wifeForbiddenResponse,
    wifeUnauthorizedResponse,
} from '../security/wifeValidator.ts';
import { UserRole } from '../../types/admin-types.ts';

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
        return null;
    }
}

export function isAdminToken(token: string): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload) return false;
    const role = payload.role;
    const appMeta = payload.app_metadata as Record<string, unknown> | undefined;
    const userMeta = payload.user_metadata as Record<string, unknown> | undefined;
    return (
        role === UserRole.SUPER_ADMIN ||
        appMeta?.role === UserRole.SUPER_ADMIN ||
        userMeta?.role === UserRole.SUPER_ADMIN ||
        role === UserRole.MODERATOR ||
        appMeta?.role === UserRole.MODERATOR ||
        userMeta?.role === UserRole.MODERATOR
    );
}

function isForumDevServer(): boolean {
    const env = process.env.NODE_ENV ?? '';
    return env === 'development' || env === 'test';
}

export async function requireForumAuth(request: Request): Promise<
    | { ok: false; response: Response }
    | { ok: true; userId: string; token: string; isAdmin: boolean }
> {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
        return { ok: false as const, response: wifeUnauthorizedResponse() };
    }
    // في التطوير: جلسة Supabase كافية — WIFE يُعطّل لتفادي فشل كل عمليات المنتدى
    if (!isForumDevServer() && !(await verifyWifeSignature(request, userToken))) {
        return { ok: false as const, response: wifeForbiddenResponse() };
    }
    const userId = await getVerifiedTokenSubject(userToken);
    if (!userId) {
        return { ok: false as const, response: wifeUnauthorizedResponse() };
    }
    return { ok: true as const, userId, token: userToken, isAdmin: isAdminToken(userToken) };
}

export function jsonResponse(status: number, body: Record<string, unknown>): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
}

/**
 * يُجمع المصادقة + فحص الحظر معاً.
 * يُستخدم في كل route كتابي حساس (create/update/delete/report/sync/comment).
 * الأدمن لا يخضع لفحص الحظر (تعطيل ذاتي مستحيل).
 */
export async function requireForumAuthAndUnbanned(request: Request): Promise<
    | { ok: false; response: Response }
    | { ok: true; userId: string; token: string; isAdmin: boolean }
> {
    const auth = await requireForumAuth(request);
    if ('response' in auth) return auth;
    if (auth.isAdmin) return auth;
    // import ديناميكي لتجنّب الدائرة (ForumRepository يستورد من نفس الشجرة)
    const { ForumRepository } = await import('../../services/forum/forumRepository.ts');
    const banned = await ForumRepository.isBanned(auth.userId);
    if (banned) {
        return {
            ok: false as const,
            response: jsonResponse(403, { ok: false, error: 'حسابك محظور من المنتدى' }),
        };
    }
    return auth;
}
