import { hasAcceptedCurrentLegalTerms } from '@/app/services/auth/legalTermsAcceptance';
import { isPasswordRecoveryPending } from '@/app/services/auth/passwordRecoveryGate';
import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';

/** يسخّن شاشة الهوية المطلوبة فقط — لا يسحب FullBoot. */
export function prefetchLawyerAuthLane(): void {
    if (typeof window === 'undefined') return;
    if (isPasswordRecoveryPending()) {
        void import('@/app/bootstrap/lawyerAuth/LawyerPasswordResetGate');
        return;
    }
    if (!isShellAuthBypassed() && !hasAcceptedCurrentLegalTerms()) {
        void import('@/app/bootstrap/lawyerAuth/LegalTermsConsentGate');
        return;
    }
    void import('@/app/bootstrap/lawyerAuth/LawyerAuthLaneHost');
    void import('@/app/bootstrap/LawyerSignInGate');
}
