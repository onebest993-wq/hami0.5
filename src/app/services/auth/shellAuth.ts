import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';

/** معرّفات لا تُعدّ جلسة Supabase/BFF حقيقية في بوابات الواجهة (إنتاج) */
export const SHELL_NON_AUTH_USER_IDS = new Set<string>([GUEST_LAWYER_ID, 'demo_user']);

/**
 * فتح ميزات الواجهة بدون Supabase حقيقي.
 * - DEV/اختبار: مفعّل افتراضياً
 * - إنتاج: مغلق ما لم يُطلَب صراحةً بـVITE_SHELL_AUTH_OPEN=true
 *
 * كان الإنتاج يُفتح ضمنياً كلّما لم يساوِ VITE_BFF_AUTH القيمة 'true' بالضبط، فكان
 * نسيان متغيّر بيئة واحد يكفي لإلغاء تسجيل الدخول عن لوحة المحامي كاملةً.
 * الإغلاق لا يحبس أحداً: مع إطفاء BFF يقرأ authBoot جلسة Supabase المحفوظة.
 */
export function isShellAuthBypassed(): boolean {
    const flag = import.meta.env.VITE_SHELL_AUTH_OPEN;
    if (flag === 'false') return false;
    if (flag === 'true') return true;
    // غير الإنتاج (dev/vitest): مفتوح افتراضياً — يعتمد PROD لا DEV (stubEnv)
    return import.meta.env.PROD !== true;
}

export function isShellDemoUserId(userId: string | null | undefined): boolean {
    const id = userId?.trim();
    if (!id) return false;
    return SHELL_NON_AUTH_USER_IDS.has(id);
}

/** مستخدم مسموح له باستخدام بوابات الواجهة */
export function isRealSignedIn(userId: string | null | undefined): boolean {
    const id = userId?.trim();
    if (!id) return isShellAuthBypassed();
    if (isShellAuthBypassed()) return true;
    return !isShellDemoUserId(id);
}

/** أول معرّف متاح للفحص (يفضّل auth ثم user العرض) */
export function resolveShellAuthUserId(
    authUserId?: string | null,
    displayUserId?: string | null,
): string | null {
    const auth = authUserId?.trim();
    if (auth) return auth;
    const display = displayUserId?.trim();
    if (display) return display;
    if (isShellAuthBypassed()) return GUEST_LAWYER_ID;
    return null;
}
