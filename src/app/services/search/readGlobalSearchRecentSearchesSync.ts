import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LEGACY_RECENT_SEARCHES_KEY,
    globalSearchRecentStorageKey,
    sanitizeRecentSearchLabels,
} from '@/app/services/search/globalSearchQuerySecurity';
import { readSecureOrDrainLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';

function parseRecentLabels(raw: string | null): string[] | null {
    if (!raw) return null;
    try {
        return sanitizeRecentSearchLabels(JSON.parse(raw));
    } catch {
        return null;
    }
}

/** قراءة متزامنة لـ «الأخيرة» — أول paint عندما الذاكرة دافئة */
export function readGlobalSearchRecentSearchesSync(
    userId: string | null | undefined,
): string[] {
    const key = globalSearchRecentStorageKey(userId);
    if (!key) return [];
    try {
        const saved = readSecureOrDrainLegacySync(key);
        const parsed = parseRecentLabels(saved);
        if (parsed) return parsed;
        if (saved) {
            SecureStoreService.deleteItemSync(key);
            return [];
        }

        /* مفتاح قديم مشترك بين الحسابات — يُحذف ولا يُهاجَر حتى لا يتسرّب بحث مستخدم سابق */
        const legacy = SecureStoreService.getItemSync(LEGACY_RECENT_SEARCHES_KEY);
        if (legacy) {
            SecureStoreService.deleteItemSync(LEGACY_RECENT_SEARCHES_KEY);
            try {
                localStorage.removeItem(LEGACY_RECENT_SEARCHES_KEY);
            } catch {
                /* ignore */
            }
        }
        return [];
    } catch {
        return [];
    }
}

/** قراءة غير متزامنة — تفك تشفير المفتاح عند البرود ثم تُحدّث الواجهة */
export async function hydrateGlobalSearchRecentSearches(
    userId: string | null | undefined,
): Promise<string[]> {
    const key = globalSearchRecentStorageKey(userId);
    if (!key) return [];
    try {
        const saved = await SecureStoreService.getItem(key);
        const parsed = parseRecentLabels(saved);
        if (parsed) return parsed;
        if (saved) {
            await SecureStoreService.deleteItem(key);
            return [];
        }

        const legacy = await SecureStoreService.getItem(LEGACY_RECENT_SEARCHES_KEY);
        if (legacy) await SecureStoreService.deleteItem(LEGACY_RECENT_SEARCHES_KEY);
        return [];
    } catch {
        return [];
    }
}
