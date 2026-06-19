import { requireWifeUser } from '../security/bffAuth.ts';
import { extractUserTokenFromRequest } from '../security/wifeValidator.ts';
import { recordWifeRejection } from '../security/wifeSecurityMonitor.ts';
import { isForumModeratorUserId } from '../security/roleResolver.ts';

export async function requireForumAuth(request: Request): Promise<
    | { ok: false; response: Response }
    | { ok: true; userId: string; token: string; isAdmin: boolean }
> {
    const auth = await requireWifeUser(request);
    if (!auth.ok) return auth;

    const userToken = extractUserTokenFromRequest(request) ?? '';
    const isAdmin = await isForumModeratorUserId(auth.userId);
    return { ok: true as const, userId: auth.userId, token: userToken, isAdmin };
}

export function jsonResponse(status: number, body: Record<string, unknown>): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
}

/**
 * يُجمع المصادقة + فحص الحظر معاً.
 * الأدمن/المشرف لا يخضع لفحص الحظر (تعطيل ذاتي مستحيل).
 */
export async function requireForumAuthAndUnbanned(request: Request): Promise<
    | { ok: false; response: Response }
    | { ok: true; userId: string; token: string; isAdmin: boolean }
> {
    const auth = await requireForumAuth(request);
    if ('response' in auth) return auth;
    if (auth.isAdmin) return auth;
    const { ForumRepository } = await import('../../services/forum/forumRepository.ts');
    const banned = await ForumRepository.isBanned(auth.userId);
    if (banned) {
        recordWifeRejection({
            reason: 'forum_banned',
            request,
            userId: auth.userId,
        });
        return {
            ok: false as const,
            response: jsonResponse(403, { ok: false, error: 'حسابك محظور من المنتدى' }),
        };
    }
    return auth;
}
