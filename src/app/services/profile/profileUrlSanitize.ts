const UNSAFE_CSS_VALUE = /[;{}\\]/;
const HEX_COLOR = /^#[0-9A-Fa-f]{3,8}$/;
const RGBA_COLOR =
    /^rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+%?\s*)?\)$/i;

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
const MIN_DATA_IMAGE_PAYLOAD = 48;

function isValidDataImageUrl(raw: string): boolean {
    if (raw.length > MAX_DATA_IMAGE_LEN) return false;
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

    const httpCandidate = trimmed.slice(0, 2048);
    if (!httpCandidate || /[<>'"`\s]/.test(httpCandidate)) return undefined;

    try {
        const url = new URL(httpCandidate);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
        if (url.username || url.password) return undefined;
        return url.href.slice(0, 2048);
    } catch {
        return undefined;
    }
}

/** Safe `background-image` value — quoted url() only after validation. */
export function safeProfileCssBackgroundImage(raw: string | undefined): string | undefined {
    const safe = sanitizeProfileMediaUrl(raw);
    if (!safe) return undefined;
    const escaped = safe.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `url("${escaped}")`;
}
