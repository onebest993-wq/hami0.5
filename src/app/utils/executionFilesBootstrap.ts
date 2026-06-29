import { storageCache } from '@/app/utils/storageCache';
import {
    EXECUTION_FILES_STORAGE_KEY,
    loadExecutionFilesRaw,
} from '@/app/utils/executionFilesStorage';

/** قراءة فورية من الذاكرة المؤقتة أو التخزين المتزامن — قبل ensurePersistedReady */
export function readExecutionFilesBootstrap(): unknown[] {
    const cached = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
    if (Array.isArray(cached)) return cached;
    return loadExecutionFilesRaw();
}
