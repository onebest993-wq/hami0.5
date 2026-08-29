/** مسارات same-origin لا تُوقَّع بـ WIFE — مصدر واحد للحارس والعميل الآمن */

export const WIFE_UNSIGNED_API_PREFIXES = ['/api/public'] as const;

/** إقلاع المصادقة والتوقيع — الخادم لا يتحقق من WIFE عليها؛ الحارس لا يعيد توقيعها */
export const WIFE_BOOTSTRAP_API_PATHS = [
    '/api/security/wife-sign',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/auth/session',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/resend-confirmation',
    '/api/auth/otp/request',
    '/api/auth/otp/complete',
    '/api/auth/otp/channels',
    '/api/auth/otp/preview',
    '/api/admin/verify',
    '/api/admin/otp/csrf',
    '/api/admin/otp/request',
    '/api/admin/otp/verify',
    '/api/admin/otp/status',
    '/api/admin/otp/dev-unlock',
] as const;

function normalizeWifeApiPath(pathname: string): string {
    const stripped = pathname.trim().split('?')[0] ?? '/';
    if (stripped.length > 1 && stripped.endsWith('/')) return stripped.replace(/\/+$/, '');
    return stripped || '/';
}

export function isWifeUnsignedApiPath(pathname: string): boolean {
    const normalized = normalizeWifeApiPath(pathname);
    return WIFE_UNSIGNED_API_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isWifeBootstrapApiPath(pathname: string): boolean {
    return (WIFE_BOOTSTRAP_API_PATHS as readonly string[]).includes(normalizeWifeApiPath(pathname));
}

/** الحارس يمرّرها لـ fetch الأصلي: عامة أو إقلاع — وإلا حلقة wife-sign */
export function isWifeGuardNativeApiPath(pathname: string): boolean {
    return isWifeUnsignedApiPath(pathname) || isWifeBootstrapApiPath(pathname);
}
