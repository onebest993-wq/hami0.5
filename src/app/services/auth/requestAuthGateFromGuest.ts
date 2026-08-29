import { clearDevMockAuth } from '@/app/utils/authStorage';
import { clearExplicitDevUnlock } from '@/app/services/auth/devUnlockSession';
import { clearExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import {
    setPreferredAuthGateMode,
    type AuthGatePreferredMode,
} from '@/app/services/auth/authGatePreferredMode';

export const HAMI_REQUEST_AUTH_GATE_EVENT = 'hami:request-auth-gate';

/** من المنتدى/الضيف — اخرج من جلسة الضيف واطلب بوابة الدخول دون مسح بيانات التطبيق */
export function requestAuthGateFromGuest(mode: Extract<AuthGatePreferredMode, 'login' | 'register'>): void {
    setPreferredAuthGateMode(mode);
    clearExplicitLocalGuest();
    clearExplicitDevUnlock();
    clearDevMockAuth();
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(
            new CustomEvent(HAMI_REQUEST_AUTH_GATE_EVENT, { detail: { mode } }),
        );
    } catch {
        /* ignore */
    }
}
