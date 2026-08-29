const VAULT_IMAGE_MIME = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/heic',
    'image/heif',
]);

const SCRIPTABLE_NAME = /\.(svg|xml|html?|js|mjs|xhtml)$/i;

export function isScriptableVaultMedia(mimeType: string, fileName?: string): boolean {
    const mime = (mimeType || '').toLowerCase();
    const name = fileName || '';
    return (
        mime.includes('svg') ||
        mime.includes('xml') ||
        mime === 'text/html' ||
        mime === 'application/javascript' ||
        SCRIPTABLE_NAME.test(name)
    );
}

export function isAllowedVaultImageMeta(mimeType: string, fileName?: string): boolean {
    const mime = (mimeType || '').toLowerCase();
    const name = fileName || '';
    if (isScriptableVaultMedia(mime, name)) return false;
    if (VAULT_IMAGE_MIME.has(mime)) return true;
    return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name);
}

const DATA_IMAGE =
    /^data:image\/(jpeg|jpg|png|webp|gif|bmp|heic|heif)[;,]/i;
const DATA_PDF = /^data:application\/pdf[;,]/i;
const DATA_AUDIO = /^data:audio\/[a-z0-9.+-]+[;,]/i;

/**
 * روابط معاينة المخزن المسموحة فقط — يمنع javascript: وdata:text/html وSVG.
 * blob: وhttps: وdata للصورة/PDF/الصوت. http فقط لـ localhost أثناء التطوير.
 */
export function isSafeVaultPreviewUrl(url: string | null | undefined): boolean {
    const value = (url || '').trim();
    if (!value) return false;
    const lower = value.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return false;
    if (lower.startsWith('blob:')) return true;
    if (DATA_IMAGE.test(value) || DATA_PDF.test(value) || DATA_AUDIO.test(value)) return true;
    if (lower.startsWith('data:')) return false;
    try {
        const parsed = new URL(value, typeof window !== 'undefined' ? window.location.href : 'https://local.invalid');
        if (parsed.protocol === 'https:') return true;
        if (parsed.protocol === 'http:') {
            return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
        }
        return false;
    } catch {
        return false;
    }
}

export function sanitizeVaultPreviewUrl(url: string | null | undefined): string | null {
    const value = (url || '').trim();
    return isSafeVaultPreviewUrl(value) ? value : null;
}

/** ملاحظة/وصف المخزن تُعرض كنص — تُزال الوسوم قبل التخزين */
export function sanitizeVaultPlainNote(note: string | null | undefined): string | null {
    if (note == null) return null;
    const stripped = String(note)
        .replace(/<[^>]*>/g, ' ')
        .replace(/javascript:/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!stripped) return null;
    return stripped.slice(0, 8_000);
}
