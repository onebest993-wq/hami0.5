/** حد أقصى لطول استعلام البحث — يمنع إساءة استخدام Fuse والذاكرة */
export const GLOBAL_SEARCH_MAX_QUERY_LENGTH = 128;

/** حد تسمية النتيجة المحفوظة في «الأخيرة» */
export const GLOBAL_SEARCH_MAX_RECENT_LABEL_LENGTH = 80;

export const GLOBAL_SEARCH_MAX_RECENT_COUNT = 8;

const RECENT_SEARCHES_KEY_PREFIX = 'lawyer_recent_searches';
export const LEGACY_RECENT_SEARCHES_KEY = 'lawyer_recent_searches';

/** مفتاح تخزين «الأخيرة» مرتبط بالمستخدم — يمنع تسرّب بين الحسابات على نفس الجهاز */
export function globalSearchRecentStorageKey(userId: string | null | undefined): string | null {
    const id = typeof userId === 'string' ? userId.trim() : '';
    if (!id) return null;
    return `${RECENT_SEARCHES_KEY_PREFIX}:${id}`;
}

/** أحرف تحكم + تجاوز اتجاه النص — لا تُمرَّر للاستعلام أو العرض */
const SEARCH_UNSAFE_CHARS_RE = /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;

export function stripSearchUnsafeChars(raw: string): string {
    return raw.replace(SEARCH_UNSAFE_CHARS_RE, '');
}

export function clampGlobalSearchQuery(raw: string): string {
    if (!raw) return '';
    return stripSearchUnsafeChars(raw)
        .replace(/<[^>]*>/g, '')
        .slice(0, GLOBAL_SEARCH_MAX_QUERY_LENGTH);
}

export function clampRecentSearchLabel(raw: string): string {
    const trimmed = stripSearchUnsafeChars(raw).replace(/<[^>]*>/g, '').trim();
    if (!trimmed) return '';
    return trimmed.slice(0, GLOBAL_SEARCH_MAX_RECENT_LABEL_LENGTH);
}

export function sanitizeRecentSearchLabels(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of raw) {
        if (typeof item !== 'string') continue;
        const label = clampRecentSearchLabel(item);
        if (!label || seen.has(label)) continue;
        seen.add(label);
        out.push(label);
        if (out.length >= GLOBAL_SEARCH_MAX_RECENT_COUNT) break;
    }
    return out;
}
