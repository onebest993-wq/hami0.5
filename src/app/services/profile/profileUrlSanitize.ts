const UNSAFE_CSS_VALUE = /[;{}\\]/;
const HEX_COLOR = /^#[0-9A-Fa-f]{3,8}$/;
const RGBA_COLOR =
    /^rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+%?\s*)?\)$/i;

/** نص عادي آمن للعرض (React text) — يزيل تحكم/وسوم محتملة ويحد الطول */
export function sanitizeProfilePlainText(raw: unknown, maxLen: number): string {
    if (typeof raw !== 'string') return '';
    return raw
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<\/?[a-z][^>]*>/gi, '')
        .slice(0, Math.max(0, maxLen));
}

/** Validates canvas / block background colors before CSS injection. */
export function sanitizeProfileCanvasColor(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim().slice(0, 32);
    if (!trimmed || UNSAFE_CSS_VALUE.test(trimmed) || /url\s*\(/i.test(trimmed)) return undefined;
    if (HEX_COLOR.test(trimmed) || RGBA_COLOR.test(trimmed)) return trimmed;
    if (
        trimmed.startsWith('color-mix(in srgb,') &&
        trimmed.endsWith(')') &&
        !trimmed.includes(';')
    ) {
        return trimmed;
    }
    return undefined;
}

const DATA_IMAGE_BASE64_RE =
    /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/]+=*?)$/i;
const MAX_DATA_IMAGE_LEN = 512_000;
/** خلفيات لوحة الكتابة في الملف — دقة أعلى عند التخزين المحلي */
export const MAX_CANVAS_DATA_IMAGE_LEN = 2_500_000;
const MIN_DATA_IMAGE_PAYLOAD = 48;
/** روابط HTTPS الموقّعة قد تتجاوز 2048 — لا تُقصّ (القص يكسر التوقيع ويُظهر صورة فارغة) */
const MAX_HTTP_MEDIA_URL_LEN = 8192;

function isValidDataImageUrl(raw: string, maxLen = MAX_DATA_IMAGE_LEN): boolean {
    if (raw.length > maxLen) return false;
    if (/[<>'"`\s]/.test(raw)) return false;
    /** روابط data:image كانت تُقصّ عند 2048 حرفاً — تُرفض لتجنّب ERR_INVALID_URL */
    if (raw.length >= 2047 && raw.length <= 2049) return false;
    const match = raw.match(DATA_IMAGE_BASE64_RE);
    if (!match) return false;
    const payload = match[2];
    if (payload.length < MIN_DATA_IMAGE_PAYLOAD) return false;
    if (payload.length % 4 === 1) return false;
    return true;
}

/** Allowlist https/http and vetted data:image URLs for profile media. */
export function sanitizeProfileMediaUrl(raw: string | undefined): string | undefined {
    if (!raw || typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith('data:image/')) {
        return isValidDataImageUrl(trimmed) ? trimmed : undefined;
    }

    if (trimmed.length > MAX_HTTP_MEDIA_URL_LEN) return undefined;
    if (/[<>'"`\s]/.test(trimmed)) return undefined;

    try {
        const url = new URL(trimmed);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
        if (url.username || url.password) return undefined;
        /* SVG كـ <img> يمكن أن ينفّذ سكربتات في محركات قديمة — ارفض المسار */
        if (/\.svgz?$/i.test(url.pathname)) return undefined;
        return url.href;
    } catch {
        return undefined;
    }
}

/** خلفية لوحة الكتابة — حد أعلى للـ data URL المحلي */
export function sanitizeProfileCanvasMediaUrl(raw: string | undefined): string | undefined {
    if (!raw || typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    if (!trimmed.startsWith('data:image/')) return sanitizeProfileMediaUrl(trimmed);
    return isValidDataImageUrl(trimmed, MAX_CANVAS_DATA_IMAGE_LEN) ? trimmed : undefined;
}

/** مسار تخزين آمن لإعادة توقيع الروابط — لا يُعرض للزائر */
export function sanitizeProfileStoragePath(raw: string | undefined): string | undefined {
    if (!raw || typeof raw !== 'string') return undefined;
    const trimmed = raw.trim().slice(0, 512);
    if (!trimmed) return undefined;
    if (/[<>'"`\s]/.test(trimmed)) return undefined;
    if (/^(javascript|data|file):/i.test(trimmed)) return undefined;
    return trimmed;
}

/** Safe `background-image` value — quoted url() only after validation. */
export function safeProfileCssBackgroundImage(raw: string | undefined): string | undefined {
    const safe = sanitizeProfileMediaUrl(raw);
    if (!safe) return undefined;
    const escaped = safe.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `url("${escaped}")`;
}
