import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LEGACY_RECENT_SEARCHES_KEY,
    globalSearchRecentStorageKey,
    sanitizeRecentSearchLabels,
} from '@/app/services/search/globalSearchQuerySecurity';

/** قراءة متزامنة لـ «الأخيرة» — أول paint بدون فراغ→ظهور */
export function readGlobalSearchRecentSearchesSync(
    userId: string | null | undefined,
): string[] {
    const key = globalSearchRecentStorageKey(userId);
    if (!key) return [];
    try {
        const saved = SecureStoreService.getItemSync(key);
        if (saved) {
            try {
                return sanitizeRecentSearchLabels(JSON.parse(saved));
            } catch {
                SecureStoreService.deleteItemSync(key);
                return [];
            }
        }
        const legacy = SecureStoreService.getItemSync(LEGACY_RECENT_SEARCHES_KEY);
        if (!legacy) return [];
        try {
            const migrated = sanitizeRecentSearchLabels(JSON.parse(legacy));
            if (migrated.length > 0) {
                SecureStoreService.setItemSync(key, JSON.stringify(migrated));
            }
            SecureStoreService.deleteItemSync(LEGACY_RECENT_SEARCHES_KEY);
            return migrated;
        } catch {
            SecureStoreService.deleteItemSync(LEGACY_RECENT_SEARCHES_KEY);
            return [];
        }
    } catch {
        return [];
    }
}
