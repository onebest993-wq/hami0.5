import { recordWifeRejection } from '../security/wifeSecurityMonitor.ts';
import { requireWifeUser } from '../security/bffAuth.ts';
import { extractUserTokenFromRequest } from '../security/wifeValidator.ts';
import { canAccessLawyerForumUserId, isForumModeratorUserId } from '../security/roleResolver.ts';

/** محامٍ ضيف للعرض التجريبي — قراءة فقط في الإنتاج */
export const DEMO_GUEST_USER_ID = 'guest-lawyer-1';

function isProductionForumEnv(): boolean {
    return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

export function isDemoGuestUserId(userId: string): boolean {
    return userId === DEMO_GUEST_USER_ID;
}

/** يُرجع Response رفض أو null إذا مسموح */
export function rejectDemoGuestForumWrite(userId: string, request?: Request): Response | null {
    if (!isProductionForumEnv()) return null;
    if (!isDemoGuestUserId(userId)) return null;
    if (request) {
        recordWifeRejection({
            reason: 'forum_guest_write_denied',
            request,
            userId,
        });
    }
    return jsonResponse(401, {
        ok: false,
        error: 'يجب تسجيل الدخول بحساب حقيقي للمشاركة في المنتدى',
        code: 'FORUM_AUTH_REQUIRED',
    });
}

export async function requireForumAuth(request: Request): Promise<
    | { ok: false; response: Response }
    | { ok: true; userId: string; token: string; isAdmin: boolean }
> {
    const auth = await requireWifeUser(request);
    if (auth.ok === false) return auth;

    if (!isDemoGuestUserId(auth.userId)) {
        const canAccessForum = await canAccessLawyerForumUserId(auth.userId);
        if (!canAccessForum) {
            return {
                ok: false as const,
                response: jsonResponse(403, {
                    ok: false,
                    error: 'الوصول إلى المنتدى مقتصر على حسابات المحامين المفعلة',
                    code: 'FORUM_ACCESS_DENIED',
                }),
            };
        }
    }

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
 * يُجمع المصادقة + فحص الحظر + رفض الضيف في الإنتاج للكتابة.
 */
export async function requireForumAuthAndUnbanned(request: Request): Promise<
    | { ok: false; response: Response }
    | { ok: true; userId: string; token: string; isAdmin: boolean }
> {
    const auth = await requireForumAuth(request);
    if ('response' in auth) return auth;

    const guestDenied = rejectDemoGuestForumWrite(auth.userId, request);
    if (guestDenied) {
        return { ok: false as const, response: guestDenied };
    }

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

/** للمسارات التي تستخدم requireForumAuth فقط على POST (مثل bookmark) */
export function assertForumWriteAllowed(
    userId: string,
    request: Request,
): { ok: true } | { ok: false; response: Response } {
    const denied = rejectDemoGuestForumWrite(userId, request);
    if (denied) return { ok: false as const, response: denied };
    return { ok: true as const };
}
