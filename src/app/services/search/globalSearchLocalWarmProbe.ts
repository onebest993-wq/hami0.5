import { hasAnyCachedGlobalSearchFuse } from '@/app/services/globalSearchFuse';
import { getCachedGlobalSearchExtras } from '@/app/services/globalSearchExtrasCache';

/** Peek كاش الجلسة فقط — لا يبني فهرساً ولا يحمّل cloud. */
export function hasGlobalSearchLocalWarmCache(userId: string | null | undefined): boolean {
    if (hasAnyCachedGlobalSearchFuse()) return true;
    if (!userId) return false;
    return getCachedGlobalSearchExtras(userId) != null;
}
