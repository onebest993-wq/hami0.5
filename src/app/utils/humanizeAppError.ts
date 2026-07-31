import { SecureFetchError } from '@/app/services/SecureFetchError';

const ARABIC_BY_CODE: Record<string, string> = {
    api_unavailable: 'الوضع المحلي — الخادم غير متصل. التطبيق يعمل من بيانات هذا الجهاز.',
    kv_local_only: '',
    unauthenticated: 'يرجى تسجيل الدخول أولاً.',
};

const SILENT_CODES = new Set(['api_unavailable', 'kv_local_only']);

/** أخطاء متوقعة على الاستضافة الثابتة — لا تُعرض للمستخدم */
export function isSilentOfflineError(err: unknown): boolean {
    if (err instanceof SecureFetchError) {
        const code = resolveSecureFetchErrorCode(err);
        if (code && SILENT_CODES.has(code)) return true;
        if (err.status === 503 && err.message.trim() === 'api_unavailable') return true;
    }
    if (err instanceof Error) {
        const msg = err.message.trim();
        if (msg === 'api_unavailable' || msg === 'kv_local_only') return true;
    }
    return false;
}

export function resolveSecureFetchErrorCode(err: SecureFetchError): string | undefined {
    if (err.message.trim() === 'api_unavailable') return 'api_unavailable';
    if (err.message.trim() === 'unauthenticated') return 'unauthenticated';
    return undefined;
}

/**
 * يحوّل رموز الأخطاء الداخلية إلى عربي.
 * يُرجع null إذا كان الخطأ صامتاً (لا Toast).
 */
export function humanizeUserErrorMessage(message: string): string | null {
    const trimmed = message.trim();
    if (!trimmed) return null;
    if (SILENT_CODES.has(trimmed)) return null;
    if (ARABIC_BY_CODE[trimmed] !== undefined) {
        const mapped = ARABIC_BY_CODE[trimmed];
        return mapped.length > 0 ? mapped : null;
    }
    if (/^api_unavailable$/i.test(trimmed)) return null;
    if (/^kv_local_only$/i.test(trimmed)) return null;
    if (/^unauthenticated$/i.test(trimmed)) return ARABIC_BY_CODE.unauthenticated;
    return trimmed;
}

export function humanizeUnknownError(err: unknown, fallback = 'تعذّر تنفيذ العملية'): string | null {
    if (isSilentOfflineError(err)) return null;
    if (err instanceof SecureFetchError) {
        const code = resolveSecureFetchErrorCode(err);
        if (code && ARABIC_BY_CODE[code] !== undefined) {
            const mapped = ARABIC_BY_CODE[code];
            return mapped.length > 0 ? mapped : null;
        }
    }
    if (err instanceof Error && err.message.trim()) {
        return humanizeUserErrorMessage(err.message);
    }
    return fallback;
}
