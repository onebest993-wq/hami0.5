/**
 * سطح مقر القيادة ليس واجهة المحامي العامة.
 *
 * - جهاز محامٍ (Capacitor / WebView / هاتف) → 404 بلا الإعلان عن المسار.
 * - مشروع Vercel العام (VERCEL_ENV=production|preview بلا علم المقر) → 404.
 * - HAMI_HQ_ALLOW_THIS_DEPLOYMENT=true على استضافة المقر فقط → يأذن لهذا النشر.
 * - HAMI_HQ_HOSTS إن ضُبط: المضيف يجب أن يطابق القائمة (فشل مغلق).
 * - تطوير/اختبار محلي بلا VERCEL_ENV: السلوك الحالي يبقى.
 *
 * /api/auth/lawyer-verification ليس مساراً حصرياً للمقر (رفع الحالة من الهاتف).
 * طابور المقر على ذلك المسار يمرّ من requireTrustedHeadquartersAdmin فيرث هذه البوابة.
 */
import { getWifeEnv } from './wifeStoreEnv.ts';
import { wifeJsonNoStore } from './wifeSecurityHeaders.ts';

export function headquartersNotFoundResponse(): Response {
    return wifeJsonNoStore(404, { error: 'Not found' });
}

function normalizeApiPath(pathname: string): string {
    const cut = pathname.indexOf('?');
    const raw = (cut === -1 ? pathname : pathname.slice(0, cut)).trim() || '/';
    const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
    if (withSlash.length > 1 && withSlash.endsWith('/')) return withSlash.slice(0, -1);
    return withSlash;
}

export function isHeadquartersOnlyApiPath(pathname: string): boolean {
    const path = normalizeApiPath(pathname);
    if (path === '/api/admin' || path.startsWith('/api/admin/')) return true;
    if (path === '/api/forum/ban' || path.startsWith('/api/forum/ban/')) return true;
    if (path === '/api/forum/stats' || path.startsWith('/api/forum/stats/')) return true;
    if (path === '/api/forum/reports' || path.startsWith('/api/forum/reports/')) return true;
    if (path === '/api/laws/add' || path === '/api/laws/clear' || path === '/api/laws/import-bundle') {
        return true;
    }
    return false;
}

function allowlistHostnames(raw: string): string[] {
    const hosts: string[] = [];
    for (const part of raw.split(',')) {
        const host = hostnameFromAllowEntry(part);
        if (host) hosts.push(host);
    }
    return hosts;
}

function hostnameFromAllowEntry(raw: string): string {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return '';
    if (trimmed.startsWith('[')) {
        const end = trimmed.indexOf(']');
        if (end > 1) return trimmed.slice(1, end);
    }
    if (trimmed.includes('://')) {
        try {
            return new URL(trimmed).hostname.toLowerCase();
        } catch {
            return '';
        }
    }
    if (/^[a-z0-9.-]+:\d+$/i.test(trimmed)) return trimmed.replace(/:\d+$/, '');
    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(trimmed)) return trimmed.split(':')[0] ?? '';
    return trimmed;
}

export function requestHostname(request: Request): string {
    try {
        return new URL(request.url).hostname.toLowerCase();
    } catch {
        return '';
    }
}

function isHqDeployment(): boolean {
    return getWifeEnv('HAMI_HQ_ALLOW_THIS_DEPLOYMENT').toLowerCase() === 'true';
}

function isVercelHostedSurface(): boolean {
    const env = getWifeEnv('VERCEL_ENV').toLowerCase();
    return env === 'production' || env === 'preview';
}

export function isHeadquartersHostAllowed(request: Request): boolean {
    const host = requestHostname(request);
    const allowed = allowlistHostnames(getWifeEnv('HAMI_HQ_HOSTS'));
    const vercelHost = hostnameFromAllowEntry(getWifeEnv('VERCEL_URL'));

    if (isHqDeployment()) {
        if (allowed.length === 0) return Boolean(host);
        if (host && allowed.includes(host)) return true;
        return Boolean(host) && Boolean(vercelHost) && host === vercelHost;
    }

    if (allowed.length > 0) {
        return Boolean(host) && allowed.includes(host);
    }

    if (isVercelHostedSurface()) return false;
    return true;
}

/**
 * إشارة جهاز محامٍ — ليست إثبات هوية. المتصفّح المكتبي لا يُطابق.
 * حدّ صادق: iPad بوضع سطح المكتب قد يظهر كـ Macintosh فيُسمح له حتى يُقطع المضيف العام.
 */
export function isLawyerRuntimeClient(request: Request): boolean {
    if (request.headers.get('x-capacitor')?.trim()) return true;
    const requestedWith = request.headers.get('x-requested-with')?.trim().toLowerCase();
    if (requestedWith === 'iq.hami.legal') return true;

    const ua = request.headers.get('user-agent') ?? '';
    if (!ua) return false;
    if (/\bokhttp\b/i.test(ua)) return true;
    if (/Capacitor/i.test(ua)) return true;
    if (/Android/i.test(ua) && (/\bwv\)/.test(ua) || /Mobile/i.test(ua))) return true;
    if (/\b(iPhone|iPod)\b/i.test(ua)) return true;
    if (/\biPad\b/i.test(ua) && /Mobile/i.test(ua)) return true;
    return false;
}

/** يُستدعى من مسارات المقر فقط — أو من الموزّع بعد isHeadquartersOnlyApiPath. */
export function rejectHeadquartersPublicSurface(request: Request): Response | null {
    if (isLawyerRuntimeClient(request)) return headquartersNotFoundResponse();
    if (!isHeadquartersHostAllowed(request)) return headquartersNotFoundResponse();
    return null;
}
