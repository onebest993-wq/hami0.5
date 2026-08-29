import {
    globalSearchRecentStorageKey,
    sanitizeRecentSearchLabels,
} from '@/app/services/search/globalSearchQuerySecurity';

/**
 * قراءة أخيرة بلا SecureStore — لغطاء InstantPaintCover حتى لا يدخل التشفير على FullBoot.
 * الطبقة الحية (`useGlobalSearch`) تُرطّب عبر SecureStore عند الفتح الكامل.
 */
export function peekGlobalSearchRecentSearches(userId: string | null | undefined): string[] {
    const key = globalSearchRecentStorageKey(userId);
    if (!key || typeof localStorage === 'undefined') return [];
    try {
        const saved = localStorage.getItem(key);
        if (!saved) return [];
        return sanitizeRecentSearchLabels(JSON.parse(saved));
    } catch {
        return [];
    }
}
