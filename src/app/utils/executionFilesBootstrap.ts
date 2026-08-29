import { storageCache } from '@/app/utils/storageCache';
import { loadExecutionFilesRaw, resolveExecutionFilesStorageKey } from '@/app/utils/executionFilesStorage';

/**
 * قراءة فورية من الذاكرة المؤقتة أو التخزين المتزامن — بعد bind المالك.
 * يستخدم مفتاح المالك الحالي فقط. لا يُعاد استخدام كاش `executionFiles` العام
 * بعد الربط — ذلك كان يعرض فهرس حساب آخر في ومضة الإقلاع.
 */
export function readExecutionFilesBootstrap(): unknown[] {
    const ownerKey = resolveExecutionFilesStorageKey();
    const cachedOwner = storageCache.get(ownerKey);
    if (Array.isArray(cachedOwner)) return cachedOwner;

    return loadExecutionFilesRaw();
}
