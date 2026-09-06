/**
 * قرار مسار الإقلاع — بلا React وبلا عميل Supabase.
 * true = يُسمح بتسخين FullBoot. false = بوابة هوية فقط.
 *
 * تُستدعى هذه الدوال مرات عديدة خلال render loops (مثل LawyerDashboardGate)
 * وboot critical path. لذا نطبّق memoization بأسلوب sentinel cache لضمان
 * حساب النتيجة مرة واحدة لكل جلسة لكل input، مع تصفيف كاش للاختبارات.
 */
import { peekBootSessionUserIdSync } from '@/boot/peekBootSessionUserId';
import { isExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import { hasAcceptedCurrentLegalTerms } from '@/app/services/auth/legalTermsAcceptance';
import { isPasswordRecoveryPending } from '@/app/services/auth/passwordRecoveryGate';
import { isShellAuthBypassed, isShellDemoUserId } from '@/app/services/auth/shellAuth';

const NO_RESULT_SENTINEL: unique symbol = Symbol('should-enter-no-result');
type EnterCacheState = boolean | typeof NO_RESULT_SENTINEL;
const ENTER_CACHE_KEY_NONE = '\x00__undefined__';
const ENTER_CACHE_KEY_NULL = '\x00__null__';
let enterCache: Map<string, EnterCacheState> = new Map();

let preloadCacheState: EnterCacheState = NO_RESULT_SENTINEL;

/**
 * يُعيد تهيئة الكاش للاختبارات (beforeEach) لأن الاختبارات قد تغيّر
 * shell/auth/legalTerms flags خلال نفس الجلسة.
 */
export function resetLawyerBoardMemoForTests(): void {
    enterCache = new Map();
    preloadCacheState = NO_RESULT_SENTINEL;
}

function cacheKeyForLiveUserId(liveUserId?: string | null): string {
    if (typeof liveUserId === 'undefined') return ENTER_CACHE_KEY_NONE;
    if (liveUserId === null) return ENTER_CACHE_KEY_NULL;
    return liveUserId;
}

function computeShouldEnterLawyerDashboardBoard(liveUserId?: string | null): boolean {
    if (typeof window === 'undefined') return false;
    if (isShellAuthBypassed()) return true;
    if (isPasswordRecoveryPending()) return false;
    if (!hasAcceptedCurrentLegalTerms()) return false;
    if (isExplicitLocalGuest()) return true;
    const fromLive =
        typeof liveUserId === 'string' && liveUserId.trim() ? liveUserId.trim() : '';
    if (fromLive) {
        if (isShellDemoUserId(fromLive)) return false;
        return true;
    }
    /* null = خروج صريح — لا نُبقِي اللوحة من لقطة localStorage */
    if (liveUserId === null) return false;
    const id = peekBootSessionUserIdSync();
    if (!id) return false;
    if (isShellDemoUserId(id)) return false;
    return true;
}

export function shouldEnterLawyerDashboardBoard(liveUserId?: string | null): boolean {
    const key = cacheKeyForLiveUserId(liveUserId);
    let cached = enterCache.get(key);
    if (cached === undefined || cached === NO_RESULT_SENTINEL) {
        cached = computeShouldEnterLawyerDashboardBoard(liveUserId);
        enterCache.set(key, cached);
    }
    return cached;
}

/**
 * بعد عبور الهوية تبقى اللوحة حتى خروج صريح (`forcedAuthLane`).
 * لا تُفك عند وميض `user === null` (فتح الإعدادات / مزامنة الجلسة).
 */
export function resolveLawyerBoardEnter(params: {
    forcedAuthLane: boolean;
    laneReleased: boolean;
    liveUserId?: string | null;
}): boolean {
    if (params.forcedAuthLane) return false;
    return shouldEnterLawyerDashboardBoard(params.liveUserId) || params.laneReleased;
}

export function shouldPreloadLawyerDashboardBoard(): boolean {
    if (preloadCacheState === NO_RESULT_SENTINEL) {
        if (typeof window !== 'undefined') {
            const path = String(window.location.pathname || '').replace(/\/+$/u, '') || '/';
            if (path === '/admin' || path.startsWith('/admin/')) {
                preloadCacheState = false;
            } else {
                preloadCacheState = shouldEnterLawyerDashboardBoard();
            }
        } else {
            preloadCacheState = shouldEnterLawyerDashboardBoard();
        }
    }
    return preloadCacheState;
}
