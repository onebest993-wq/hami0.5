import { isProfileShellModuleResolved } from '@/app/runtime/profileHubLoader';
import {
    hydrateProfileWarmCachePeekSync,
    peekProfileWarmCache,
} from '@/app/services/profile/profileWarmCache';

export const PROFILE_SHELL_READY_TIMEOUT_MS = 5_000;

/** هل سطح الملف مرسوماً في DOM (keepAlive) */
export function hasProfileTreePaintedInDom(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(
        document.querySelector(
            '[data-testid="lawyer-dashboard-profile-surface"] [data-lawyer-profile-root]',
        ),
    );
}

/** فحص متزامن — كاش بيانات + شجرة مرسومة أو shell modules جاهزة */
export function isProfileShellReadySync(userId?: string | null, hostMounted = false): boolean {
    if (!hostMounted) return false;
    const uid = userId?.trim();
    if (!uid) return false;

    hydrateProfileWarmCachePeekSync(uid);
    if (peekProfileWarmCache(uid)) return true;
    if (hasProfileTreePaintedInDom()) return true;

    try {
        return isProfileShellModuleResolved();
    } catch {
        return false;
    }
}
