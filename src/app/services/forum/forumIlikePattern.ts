import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';
import { normalizeArabicSearch } from '@/app/services/search/normalizeArabicSearch';

/** العمود المطبّع المولَّد — انظر هجرة 20260830120000_forum_search_text.sql */
export const FORUM_SEARCH_TEXT_COLUMN = 'search_text';

function escapeIlikeBody(text: string): string | null {
    const escaped = text
        .replace(/\\/g, '')
        .replace(/[%_,()"]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return escaped || null;
}

/**
 * نمط ILIKE مطبّع — يقابل `search_text` المولَّد على الخادم.
 * الطيّ هنا صحيح فقط لأن العمود مطبّع بنفس القواعد.
 */
export function forumIlikeContainsPattern(raw: string): string | null {
    const folded = normalizeArabicSearch(clampGlobalSearchQuery(raw));
    if (!folded) return null;
    const body = escapeIlikeBody(folded);
    return body ? `%${body}%` : null;
}

/** نمط ILIKE بلا طيّ — للأعمدة الخام قبل تطبيق هجرة `search_text`. */
export function forumIlikeRawContainsPattern(raw: string): string | null {
    const body = escapeIlikeBody(clampGlobalSearchQuery(raw));
    return body ? `%${body}%` : null;
}

export function forumOrIlikeContentAndAuthor(pattern: string): string {
    const quoted = `"${pattern}"`;
    return `content.ilike.${quoted},author_name.ilike.${quoted}`;
}

export function forumOrIlikeTitleAndDescription(pattern: string): string {
    const quoted = `"${pattern}"`;
    return `title.ilike.${quoted},description.ilike.${quoted},author_name.ilike.${quoted}`;
}

/** هل فشل الاستعلام لأن هجرة `search_text` لم تُطبَّق بعد؟ */
export function isMissingSearchTextColumn(message: string | null | undefined): boolean {
    if (!message) return false;
    return (
        message.includes(FORUM_SEARCH_TEXT_COLUMN) &&
        /does not exist|schema cache|undefined column|42703/i.test(message)
    );
}
