import { requireWifeUser, unwrapWifeUser } from '../security/bffAuth.ts';

/** رسالة خطأ عامة — لا تُسرَّب err.message للعميل */
export const NOTIFICATIONS_API_INTERNAL_ERROR = 'تعذّر تنفيذ الطلب';

/** مصادقة موحّدة لمسارات /api/notifications/* */
export async function requireNotificationsAuth(
    request: Request,
): Promise<{ userId: string } | Response> {
    const auth = await requireWifeUser(request);
    const unwrapped = unwrapWifeUser(auth);
    if ('response' in unwrapped) return unwrapped.response;
    return { userId: unwrapped.userId };
}
