/** سلامة روابط مرفقات/عرض المنتدى — مشتركة بين الحارس وخدمة المرفقات */

const BLOCKED_URL_SCHEMES = /^(javascript|data:text\/html|vbscript):/i;
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function isSvgDataUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.startsWith('data:image/svg') || lower.includes('image/svg+xml');
}

export function isSafeForumAttachmentUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (/[\0\r\n\\]/.test(trimmed)) return false;
    /* //cdn.evil/x يُفسَّر في المتصفح كـ https:// — رفض صريح */
    if (trimmed.startsWith('//')) return false;
    if (trimmed.startsWith('data:')) {
        if (isSvgDataUrl(trimmed)) return false;
        return trimmed.startsWith('data:image/') || trimmed.startsWith('data:audio/');
    }
    if (trimmed.startsWith('blob:')) return true;
    if (trimmed.startsWith('idb:')) {
        return !trimmed.includes('..');
    }
    /* مسارات تخزين محلية/نسبية بلا مخطط شبكة */
    if (!HAS_SCHEME.test(trimmed)) {
        return !trimmed.includes('..');
    }
    if (BLOCKED_URL_SCHEMES.test(trimmed)) return false;
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/** غلاف مجموعة/صورة عرض — يُرفض إن لم يكن رابط مرفق آمناً */
export function sanitizeForumCoverImage(url: string | null | undefined): string | null {
    const trimmed = typeof url === 'string' ? url.trim() : '';
    if (!trimmed) return null;
    if (!isSafeForumAttachmentUrl(trimmed)) return null;
    return trimmed.slice(0, 2_000);
}

export function isSafeRepositorySharePath(storagePath: string): boolean {
    const trimmed = storagePath.trim();
    if (!trimmed) return false;
    if (/[\0\r\n\\]/.test(trimmed)) return false;
    if (trimmed.includes('..')) return false;
    if (trimmed.startsWith('//')) return false;
    if (trimmed.startsWith('idb:forum:')) return true;
    if (HAS_SCHEME.test(trimmed)) return false;
    return true;
}

function isHttpOrigin(origin: string): boolean {
    try {
        const parsed = new URL(origin);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export function buildRepositoryPublicFileUrl(origin: string, storagePath: string): string | null {
    if (!isHttpOrigin(origin) || !isSafeRepositorySharePath(storagePath)) return null;
    const path = storagePath.startsWith('idb:')
        ? encodeURIComponent(storagePath)
        : storagePath
              .split('/')
              .filter(Boolean)
              .map((segment) => encodeURIComponent(segment))
              .join('/');
    return `${origin.replace(/\/$/, '')}/api/file/${path}`;
}
