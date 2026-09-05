import type { Session, User } from '@supabase/supabase-js';
import { clearExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import {
    DEV_UNLOCK_LAWYER_ID,
    createDevUnlockLawyerSession,
    markExplicitDevUnlock,
} from '@/app/services/auth/devUnlockSession';
import { markLegalTermsAccepted } from '@/app/services/auth/legalTermsAcceptance';
import { applyLawyerVerificationStatusFromServer } from '@/app/services/auth/lawyerVerificationStore';
import { isLocalDevWorkLawyerEnabled } from '@/app/services/auth/shellAuth';

/**
 * جلسة عمل التطوير المحلي — محامٍ معتمد محلياً (نفس عقد «دخول كمطور»).
 * ليست ضيفاً: الضيف يغلق المنتدى ويُظهر نقصاً في الصلاحيات.
 */
export function activateLocalDevWorkLawyerSession(): { user: User; session: Session } {
    clearExplicitLocalGuest();
    markExplicitDevUnlock();
    markLegalTermsAccepted();
    applyLawyerVerificationStatusFromServer(DEV_UNLOCK_LAWYER_ID, 'active');
    return createDevUnlockLawyerSession();
}

export function tryActivateLocalDevWorkLawyerSession(): { user: User; session: Session } | null {
    if (!isLocalDevWorkLawyerEnabled()) return null;
    return activateLocalDevWorkLawyerSession();
}
