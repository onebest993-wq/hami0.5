import { describe, expect, it, beforeEach } from 'vitest';
import {
    canUseForumNetworkFeatures,
    canUseNetworkFeatures,
    canUseServerBackedNetworkFeatures,
} from '@/app/services/auth/lawyerAccountStatus';
import {
    clearExplicitDevUnlock,
    createDevUnlockLawyerSession,
    DEV_UNLOCK_LAWYER_ID,
    isExplicitDevUnlock,
    markExplicitDevUnlock,
} from '@/app/services/auth/devUnlockSession';
import { applyLawyerVerificationStatusFromServer, resetLawyerVerificationStoreForTests } from '@/app/services/auth/lawyerVerificationStore';
import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';

describe('devUnlockSession', () => {
    beforeEach(() => {
        clearExplicitDevUnlock();
        resetLawyerVerificationStoreForTests();
    });

    it('marks and clears the developer unlock flag', () => {
        expect(isExplicitDevUnlock()).toBe(false);
        markExplicitDevUnlock();
        expect(isExplicitDevUnlock()).toBe(true);
        clearExplicitDevUnlock();
        expect(isExplicitDevUnlock()).toBe(false);
    });

    it('creates a non-guest lawyer session', () => {
        const session = createDevUnlockLawyerSession();
        expect(session.user.id).toBe(DEV_UNLOCK_LAWYER_ID);
        expect(session.user.id).not.toBe('guest-lawyer-1');
        expect(session.user.user_metadata?.verificationStatus).toBe('active');
    });

    it('يفتح الشبكة بعد توثيق سجل المطوّر', () => {
        markExplicitDevUnlock();
        applyLawyerVerificationStatusFromServer(DEV_UNLOCK_LAWYER_ID, 'active');
        expect(isShellAuthBypassed()).toBe(true);
        expect(canUseNetworkFeatures(DEV_UNLOCK_LAWYER_ID)).toBe(true);
        expect(canUseServerBackedNetworkFeatures(DEV_UNLOCK_LAWYER_ID)).toBe(false);
        expect(canUseForumNetworkFeatures(DEV_UNLOCK_LAWYER_ID)).toBe(true);
        clearExplicitDevUnlock();
    });
});
