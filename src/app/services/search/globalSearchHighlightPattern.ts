/** بناء نمط RegExp آمن لتظليل البحث — يهرب الأحرف الخاصة ويحدّ طول الاستعلام */
export const HIGHLIGHT_QUERY_MAX_LENGTH = 64;

export function buildSafeHighlightPattern(query: string): RegExp | null {
    const safeQuery = query.slice(0, HIGHLIGHT_QUERY_MAX_LENGTH).trim();
    if (!safeQuery) return null;
    const escaped = safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escaped) return null;
    try {
        return new RegExp(`(${escaped.split('').join('.*?')})`, 'gi');
    } catch {
        return null;
    }
}
