import { isExplicitDevUnlock } from '@/app/services/auth/devUnlockSession';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';

/** معرّفات لا تُعدّ جلسة Supabase/BFF حقيقية في بوابات الواجهة (إنتاج) */
export const SHELL_NON_AUTH_USER_IDS = new Set<string>([GUEST_LAWYER_ID, 'demo_user']);

/**
 * فتح ميزات الواجهة بدون تسجيل دخول حقيقي.
 * - مفتوح فقط عند VITE_SHELL_AUTH_OPEN=true صراحةً (E2E / قياس boot)
 * - غير مضبوط أو false → بوابة الدخول تظهر (fail-closed)
 */
export function isShellAuthBypassed(): boolean {
    const flag = import.meta.env.VITE_SHELL_AUTH_OPEN;
    if (flag === 'true') return true;
    /* زر «الدخول كمطور» — DEV فقط؛ يفتح قيود الواجهة لهذه المرحلة */
    if (isExplicitDevUnlock()) return true;
    if (flag === 'false') return false;
    // الافتراضي دائماً مغلق — حتى في التطوير — حتى تظهر شاشة الدخول قبل الواجهة
    return false;
}

export function isShellDemoUserId(userId: string | null | undefined): boolean {
    const id = userId?.trim();
    if (!id) return false;
    return SHELL_NON_AUTH_USER_IDS.has(id);
}

/** مستخدم مسموح له باستخدام بوابات الواجهة الشبكية (منتدى/سحابة) */
export function isRealSignedIn(userId: string | null | undefined): boolean {
    const id = userId?.trim();
    if (!id) return isShellAuthBypassed();
    if (isShellAuthBypassed()) return true;
    return !isShellDemoUserId(id);
}

/**
 * جلسة محلية صالحة (ضيف صريح أو حساب حقيقي).
 * المستودع/التقويم/المهام/الأرشيف تعمل للضيف — المنتدى يبقى على isRealSignedIn.
 */
export function hasLocalAppSession(userId: string | null | undefined): boolean {
    const id = userId?.trim();
    if (!id) return isShellAuthBypassed();
    return true;
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
