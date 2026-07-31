import { recordWifeRejection } from '../security/wifeSecurityMonitor.ts';
import { requireWifeUser, unwrapWifeUser } from '../security/bffAuth.ts';
import { wifeJsonResponse } from '../security/wifeSecurityHeaders.ts';

/** محامٍ ضيف للعرض التجريبي — محظور على إضابير التنفيذ في الإنتاج */
export const EXECUTION_DEMO_GUEST_USER_ID = 'guest-lawyer-1';

function isProductionExecutionEnv(): boolean {
    return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

export function isExecutionDemoGuestUserId(userId: string): boolean {
    return userId === EXECUTION_DEMO_GUEST_USER_ID;
}

/**
 * في الإنتاج يُرفض ضيف العرض على كل مسارات execution-files
 * (قراءة وكتابة) ما لم يُضبط EXECUTION_ALLOW_DEMO_GUEST=1 صراحةً.
 */
export function isExecutionDemoGuestAllowed(): boolean {
    if (!isProductionExecutionEnv()) return true;
    return (process.env.EXECUTION_ALLOW_DEMO_GUEST ?? '').trim() === '1';
}

export function rejectExecutionDemoGuest(userId: string, request?: Request): Response | null {
    if (!isExecutionDemoGuestUserId(userId)) return null;
    if (isExecutionDemoGuestAllowed()) return null;
    if (request) {
        recordWifeRejection({
            reason: 'execution_guest_denied',
            request,
            userId,
        });
    }
    return wifeJsonResponse(401, {
        ok: false,
        error: 'يجب تسجيل الدخول بحساب حقيقي لاستخدام إضابير التنفيذ',
        code: 'EXECUTION_AUTH_REQUIRED',
    });
}

export async function requireExecutionFilesAuth(
    request: Request,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return { ok: false, response: authGate.response };
    const guestDenied = rejectExecutionDemoGuest(authGate.userId, request);
    if (guestDenied) return { ok: false, response: guestDenied };
    return { ok: true, userId: authGate.userId };
}
