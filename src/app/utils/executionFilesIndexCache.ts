import { storageCache } from '@/app/utils/storageCache';
import { resolveExecutionFilesStorageKey } from '@/app/utils/executionFilesStorage';

/** ذاكرة فهرس التنفيذ للمالك الحالي — بلا الكتابة على المفتاح العام */
export function peekExecutionFilesIndexCache(): unknown[] | null {
    const cached = storageCache.get(resolveExecutionFilesStorageKey());
    return Array.isArray(cached) ? cached : null;
}

/** يزامن كاش الذاكرة مع الصفوف المحفوظة دون إعادة كتابة القرص */
export function syncExecutionFilesIndexCache(rows: unknown[]): void {
    if (!Array.isArray(rows)) return;
    storageCache.touchCacheEntry(resolveExecutionFilesStorageKey(), rows);
}
