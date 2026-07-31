/** سلامة روابط مرفقات/عرض المنتدى — مشتركة بين الحارس وخدمة المرفقات */

const BLOCKED_URL_SCHEMES = /^(javascript|data:text\/html|vbscript):/i;
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function isSafeForumAttachmentUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('data:')) {
        return trimmed.startsWith('data:image/') || trimmed.startsWith('data:audio/');
    }
    if (trimmed.startsWith('blob:')) return true;
    /* مسارات تخزين محلية/نسبية بلا مخطط شبكة */
    if (trimmed.startsWith('idb:') || !HAS_SCHEME.test(trimmed)) return true;
    if (BLOCKED_URL_SCHEMES.test(trimmed)) return false;
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}
