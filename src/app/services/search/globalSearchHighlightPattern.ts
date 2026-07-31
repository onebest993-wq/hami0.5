import { normalizeArabicSearch } from '@/app/services/search/normalizeArabicSearch';

/** بناء نمط RegExp آمن لتظليل البحث — يهرب الأحرف الخاصة ويحدّ طول الاستعلام */
export const HIGHLIGHT_QUERY_MAX_LENGTH = 64;

function escapeRegexChar(ch: string): string {
    return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** توسيع أحرف عربية شائعة ليطابق التظليل كل الأشكال */
function expandArabicTokenForRegex(token: string): string {
    return Array.from(token)
        .map((ch) => {
            if (ch === 'ا' || ch === 'أ' || ch === 'إ' || ch === 'آ') return '[اأإآ]';
            if (ch === 'ه' || ch === 'ة') return '[هة]';
            if (ch === 'ي' || ch === 'ى') return '[يى]';
            return escapeRegexChar(ch);
        })
        .join('');
}

/** يقسّم الاستعلام إلى رموز ذات معنى (كلمة كاملة — ليس حرفاً حرفاً) */
export function tokenizeHighlightQuery(query: string): string[] {
    const safe = query.slice(0, HIGHLIGHT_QUERY_MAX_LENGTH).trim();
    if (!safe) return [];
    return normalizeArabicSearch(safe)
        .toLowerCase()
        .split(/\s+/u)
        .map((t) => t.trim())
        .filter((t) => t.length >= 1);
}

/**
 * نمط تظليل صارم: يطابق الرموز كاملة (أو أرقام)، مع مرونة عربية.
 * سابقاً كان `split('').join('.*?')` فيلوّن حروفاً متفرقة بشكل خاطئ.
 */
export function buildSafeHighlightPattern(query: string): RegExp | null {
    const tokens = tokenizeHighlightQuery(query).filter((t) => t.length >= 2 || /\d/u.test(t));
    if (!tokens.length) {
        const single = tokenizeHighlightQuery(query);
        if (single.length === 1 && single[0].length === 1 && /\d/u.test(single[0])) {
            return new RegExp(`(${escapeRegexChar(single[0])})`, 'giu');
        }
        return null;
    }
    const parts = tokens.map((t) => expandArabicTokenForRegex(t));
    try {
        return new RegExp(`(${parts.join('|')})`, 'giu');
    } catch {
        return null;
    }
}

export function queryHasHighlightableMatch(text: string, query: string): boolean {
    const normText = normalizeArabicSearch(text).toLowerCase();
    const tokens = tokenizeHighlightQuery(query).filter((t) => t.length >= 2 || /\d/u.test(t));
    if (!tokens.length) return false;
    return tokens.some((t) => normText.includes(t));
}
