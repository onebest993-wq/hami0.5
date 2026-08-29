/**
 * Allowlist لـ redirect_to في استعادة كلمة المرور — يمنع سرقة الرابط عبر origin خبيث.
 */

const DEFAULT_HOST_SUFFIXES = ['hami.legal', 'localhost', '127.0.0.1'] as const;

function parseOrigin(raw: string): URL | null {
    try {
        const u = new URL(raw);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
        return u;
    } catch {
        return null;
    }
}

function envAllowlist(): string[] {
    const raw =
        process.env.PASSWORD_RESET_ALLOWED_ORIGINS ??
        process.env.PUBLIC_APP_URL ??
        process.env.SITE_URL ??
        '';
    return raw
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function hostAllowed(hostname: string): boolean {
    const host = hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    for (const suffix of DEFAULT_HOST_SUFFIXES) {
        if (host === suffix || host.endsWith(`.${suffix}`)) return true;
    }
    for (const entry of envAllowlist()) {
        const u = parseOrigin(entry) ?? (() => {
            try {
                return new URL(`https://${entry}`);
            } catch {
                return null;
            }
        })();
        if (!u) continue;
        if (host === u.hostname.toLowerCase()) return true;
    }
    return false;
}

/** Capacitor / deep-link schemes المسموحة فقط */
function isAllowedAppScheme(raw: string): boolean {
    const lower = raw.toLowerCase();
    return (
        lower.startsWith('iq.hami.legal://') ||
        lower.startsWith('com.hami.app://') ||
        lower.startsWith('hami://')
    );
}

/**
 * يُرجع redirect آمناً أو سلسلة فارغة (تجاهل غير المسموح بدل تمريره).
 * إن وُجد Origin للطلب ومطابق للقائمة يُفضَّل origin الطلب عند غياب redirect.
 */
export function resolvePasswordResetRedirectTo(
    requested: string,
    request: Request,
): string {
    const trimmed = requested.trim();
    if (trimmed) {
        if (isAllowedAppScheme(trimmed)) return trimmed;
        const u = parseOrigin(trimmed);
        if (u && hostAllowed(u.hostname)) {
            return u.origin + (u.pathname === '/' ? '' : u.pathname) + u.search;
        }
        return '';
    }

    const originHeader = request.headers.get('origin')?.trim() ?? '';
    if (originHeader) {
        const u = parseOrigin(originHeader);
        if (u && hostAllowed(u.hostname)) return u.origin;
        return '';
    }

    const fromEnv = envAllowlist()[0];
    if (fromEnv) {
        const u = parseOrigin(fromEnv);
        if (u && hostAllowed(u.hostname)) return u.origin;
    }
    return '';
}
