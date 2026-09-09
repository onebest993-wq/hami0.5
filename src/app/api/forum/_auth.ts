import { recordWifeRejection } from '../security/wifeSecurityMonitor.ts';
import { requireWifeUser } from '../security/bffAuth.ts';
import { extractUserTokenFromRequest } from '../security/wifeValidator.ts';
import { canAccessLawyerForumUserId, isForumModeratorUserId, isPlatformAdminUserId } from '../security/roleResolver.ts';
import { isUserFrozenLive } from '../security/wifeUserStatus.ts';
import {
    ACCOUNT_FROZEN_CODE,
    accountFrozenUserMessage,
    FORUM_BANNED_CODE,
    forumBannedUserMessage,
} from '../security/accountRestrictionCopy.ts';
import { wifeJsonResponse } from '../security/wifeSecurityHeaders.ts';
import { canManageForumAdmin } from './adminAuth.ts';

/** محامٍ ضيف للعرض التجريبي — محظور في الإنتاج إلا بتصريح صريح */
export const DEMO_GUEST_USER_ID = 'guest-lawyer-1';

function isProductionForumEnv(): boolean {
    return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

/** قراءة الضيف في الإنتاج تتطلب FORUM_ALLOW_DEMO_GUEST_READ=1 صراحةً */
export function isForumDemoGuestReadAllowed(): boolean {
    if (!isProductionForumEnv()) return true;
    return (process.env.FORUM_ALLOW_DEMO_GUEST_READ ?? '').trim() === '1';
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

export function rejectDemoGuestForumRead(userId: string, request?: Request): Response | null {
    if (!isDemoGuestUserId(userId)) return null;
    if (isForumDemoGuestReadAllowed()) return null;
    if (request) {
        recordWifeRejection({
            reason: 'forum_guest_read_denied',
            request,
            userId,
        });
    }
    return jsonResponse(403, {
        ok: false,
        error: 'الوصول إلى المنتدى مقتصر على حسابات المحامين المفعلة',
        code: 'FORUM_ACCESS_DENIED',
    });
}

async function requireLawyerForumVerification(userId: string): Promise<Response | null> {
    try {
        const { kvGet } = await import('../security/kvStoreAdmin.ts');
        const raw = await kvGet(`lawyer-verification:${userId}`);
        if (raw && typeof raw === 'object') {
            const status = (raw as { status?: string }).status;
            if (status === 'pending' || status === 'rejected' || status !== 'active') {
                return jsonResponse(403, {
                    ok: false,
                    error:
                        status === 'rejected'
                            ? 'تم رفض توثيق الحساب — راجع الإدارة'
                            : 'حسابك قيد التدقيق — المنتدى يُفتح بعد اعتماد البيانات',
                    code: 'FORUM_VERIFICATION_REQUIRED',
                });
            }
            return null;
        }
        return jsonResponse(403, {
            ok: false,
            error: 'يلزم توثيق الحساب قبل استخدام المنتدى',
            code: 'FORUM_VERIFICATION_REQUIRED',
        });
    } catch {
        return jsonResponse(503, {
            ok: false,
            error: 'تعذّر التحقق من حالة التوثيق — حاول لاحقاً',
            code: 'FORUM_VERIFICATION_UNAVAILABLE',
        });
    }
}

export async function requireForumAuth(request: Request): Promise<
    | { ok: false; response: Response }
    | { ok: true; userId: string; token: string; isAdmin: boolean }
> {
    const auth = await requireWifeUser(request);
    if (auth.ok === false) return auth;

    if (!(await isPlatformAdminUserId(auth.userId)) && (await isUserFrozenLive(auth.userId))) {
        recordWifeRejection({
            reason: 'account_frozen',
            request,
            userId: auth.userId,
        });
        return {
            ok: false as const,
            response: jsonResponse(403, {
                ok: false,
                error: accountFrozenUserMessage(),
                code: ACCOUNT_FROZEN_CODE,
            }),
        };
    }

    if (isDemoGuestUserId(auth.userId)) {
        const guestDenied = rejectDemoGuestForumRead(auth.userId, request);
        if (guestDenied) {
            return { ok: false as const, response: guestDenied };
        }
    } else {
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

        /*
         * مدير المنصّة ليس محامياً يمرّ بتوثيق KYC — بلاغات المقر كانت تُرفض
         * بـ FORUM_VERIFICATION_REQUIRED رغم جلسة الإدارة الحية.
         */
        if (!(await isPlatformAdminUserId(auth.userId))) {
            const kycDenied = await requireLawyerForumVerification(auth.userId);
            if (kycDenied) return { ok: false as const, response: kycDenied };
        }
    }

    const userToken = extractUserTokenFromRequest(request) ?? '';
    const isAdmin = await isForumModeratorUserId(auth.userId);
    return { ok: true as const, userId: auth.userId, token: userToken, isAdmin };
}

export function jsonResponse(status: number, body: Record<string, unknown>): Response {
    return wifeJsonResponse(status, body);
}

/** إحصاءات/بلاغات/حظر — Wife + منتدى + توثيق + مشرف. الضيف التجريبي ممنوع دائماً. */
export async function requireForumAdminAuth(request: Request): Promise<
    | { ok: false; response: Response }
    | { ok: true; userId: string; token: string; isAdmin: boolean }
> {
    const auth = await requireForumAuth(request);
    if ('response' in auth) return auth;
    if (isDemoGuestUserId(auth.userId)) {
        recordWifeRejection({
            reason: 'forum_guest_admin_denied',
            request,
            userId: auth.userId,
        });
        return {
            ok: false as const,
            response: jsonResponse(403, {
                ok: false,
                error: 'الوصول إلى المنتدى مقتصر على حسابات المحامين المفعلة',
                code: 'FORUM_ACCESS_DENIED',
            }),
        };
    }
    if (!(await canManageForumAdmin(auth.userId))) {
        return {
            ok: false as const,
            response: jsonResponse(403, { ok: false, error: 'غير مصرح لك' }),
        };
    }
    return auth;
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
            response: jsonResponse(403, {
                ok: false,
                error: forumBannedUserMessage(),
                code: FORUM_BANNED_CODE,
            }),
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

export const FORUM_GENERIC_500 = 'تعذّر إتمام العملية — حاول لاحقاً';

function isUnsafeForumErrorMessage(message: string): boolean {
    if (!message) return true;
    if (
        /PGRST|permission denied|column |relation |violates|duplicate key|JWT|postgres|undefined|syntax error|null value/i.test(
            message,
        )
    ) {
        return true;
    }
    return !/[\u0600-\u06FF]/.test(message);
}

/** رسائل عامة آمنة لكل حالة مصنَّفة — تُستعمل حين يحمل الأصل تفاصيل داخلية */
const FORUM_SAFE_MESSAGE_BY_STATUS: Readonly<Record<number, string>> = {
    403: 'ليست لديك صلاحية لهذا الإجراء',
    404: 'العنصر غير موجود',
    409: 'تعارض في الحالة — أعد المحاولة',
    423: 'العنصر مقفل',
};

/** 0 = غير مصنَّف */
function classifyForumErrorStatus(message: string): number {
    if (
        message.includes('صلاحية') ||
        message.includes('الانضمام للمجموعة') ||
        message.includes('لا يمكنك') ||
        message.includes('لا يخصّك')
    ) {
        return 403;
    }
    if (message.includes('أفضل إجابة')) return 409;
    if (message.includes('مقفل')) return 423;
    if (message.includes('غير موجود')) return 404;
    return 0;
}

/**
 * أخطاء المنتدى للعميل: عربي معروف يمرّ، تفاصيل Postgres لا.
 *
 * **الحالة تُشتقّ من المعنى، والنصّ وحده هو ما يُعمَّم.** كان الترتيب معكوساً:
 * فحصُ التسريب يسبق التصنيف، فيبتلع كلَّ خطأ يحمل بادئة تقنية — بما فيه رفضُ
 * صلاحيةٍ مشروع.
 *
 * `deletePostAuthorized` يرمي حرفياً:
 *     '[forumRepo:postgres:opcode] ليس لديك صلاحية لحذف هذا المنشور'
 *
 * فيها «صلاحية» (⇒ ٤٠٣) وفيها `postgres` (⇒ تسريب). فكان الرفض يخرج **٥٠٠**:
 * عميلٌ يظنّ عطلَ خادم بدل منعٍ مقصود، ومراقبةٌ تعدّ الرفض المشروع خطأً.
 *
 * البيانات كانت سليمة دائماً — الرمي يسبق `deletePost` — فالعطل في الإبلاغ لا
 * في الحماية. والحارسان صحيحان كلٌّ على حدة؛ ترتيبهما وحده كان خاطئاً.
 *
 * وهذا لا يفتح باب تسريب: خطأ Postgres خالص لا يحمل حرفاً عربياً، فلا يُصنَّف
 * أصلاً ويبقى ٥٠٠ عاماً — التصنيف لا يرفع الحالة إلا حين تكون رسالتنا نحن
 * حاضرةً بجانب البادئة التقنية.
 */
export function forumCatchJsonResponse(err: unknown): Response {
    const message = err instanceof Error ? err.message.trim() : '';
    const classified = classifyForumErrorStatus(message);
    if (isUnsafeForumErrorMessage(message)) {
        if (classified) {
            return jsonResponse(classified, {
                ok: false,
                error: FORUM_SAFE_MESSAGE_BY_STATUS[classified] ?? FORUM_GENERIC_500,
            });
        }
        return jsonResponse(500, { ok: false, error: FORUM_GENERIC_500 });
    }
    return jsonResponse(classified || 400, { ok: false, error: message.slice(0, 180) });
}
