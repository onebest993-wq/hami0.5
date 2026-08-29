/**
 * قرار مسار الإقلاع — بلا React وبلا عميل Supabase.
 * true = يُسمح بتسخين FullBoot. false = بوابة هوية فقط.
 */
import { peekBootSessionUserIdSync } from '@/boot/peekBootSessionUserId';
import { isExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import { hasAcceptedCurrentLegalTerms } from '@/app/services/auth/legalTermsAcceptance';
import { isPasswordRecoveryPending } from '@/app/services/auth/passwordRecoveryGate';
import { isShellAuthBypassed, isShellDemoUserId } from '@/app/services/auth/shellAuth';

export function shouldEnterLawyerDashboardBoard(liveUserId?: string | null): boolean {
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
    if (typeof window !== 'undefined') {
        const path = String(window.location.pathname || '').replace(/\/+$/u, '') || '/';
        if (path === '/admin' || path.startsWith('/admin/')) return false;
    }
    return shouldEnterLawyerDashboardBoard();
}
