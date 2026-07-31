import { storageCache } from '@/app/utils/storageCache';
import {
    EXECUTION_FILES_STORAGE_KEY,
    loadExecutionFilesRaw,
    resolveExecutionFilesStorageKey,
} from '@/app/utils/executionFilesStorage';

/**
 * قراءة فورية من الذاكرة المؤقتة أو التخزين المتزامن — بعد bind المالك.
 * يستخدم مفتاح المالك (executionFiles:<uid>) وليس المفتاح العام الفارغ بعد الترحيل.
 */
export function readExecutionFilesBootstrap(): unknown[] {
    const ownerKey = resolveExecutionFilesStorageKey();
    const cachedOwner = storageCache.get(ownerKey);
    if (Array.isArray(cachedOwner)) return cachedOwner;

    // توافق: كاش قديم على المفتاح العام قبل الربط
    if (ownerKey !== EXECUTION_FILES_STORAGE_KEY) {
        const cachedUnscoped = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
        if (Array.isArray(cachedUnscoped) && cachedUnscoped.length > 0) {
            return cachedUnscoped;
        }
    }

    return loadExecutionFilesRaw();
}
