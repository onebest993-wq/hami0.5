import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';

/** إنتاج SPA ثابت (Vercel/Netlify) بدون BFF — يُفعَّل الضيف للمعاينة */
function isStaticSpaProduction(): boolean {
    return import.meta.env.PROD && import.meta.env.VITE_BFF_AUTH !== 'true';
}

/** معرّفات لا تُعدّ جلسة Supabase/BFF حقيقية في بوابات الواجهة (إنتاج) */
export const SHELL_NON_AUTH_USER_IDS = new Set<string>([GUEST_LAWYER_ID, 'demo_user']);

/**
 * فترة التطوير / المعاينة: فتح ميزات الواجهة بدون Supabase حقيقي.
 * - DEV: مفعّل افتراضياً
 * - إنتاج SPA ثابت (بدون VITE_BFF_AUTH): مفعّل افتراضياً — يمنع شاشة سوداء على Vercel
 * - VITE_SHELL_AUTH_OPEN=true|false: تجاوز صريح
 */
export function isShellAuthBypassed(): boolean {
    const flag = import.meta.env.VITE_SHELL_AUTH_OPEN;
    if (flag === 'false') return false;
    if (flag === 'true') return true;
    if (import.meta.env.DEV) return true;
    return isStaticSpaProduction();
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
