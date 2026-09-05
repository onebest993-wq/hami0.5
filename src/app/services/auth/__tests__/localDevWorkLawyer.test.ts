import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEV_UNLOCK_LAWYER_ID, clearExplicitDevUnlock, isExplicitDevUnlock } from '@/app/services/auth/devUnlockSession';
import { hasAcceptedCurrentLegalTerms } from '@/app/services/auth/legalTermsAcceptance';
import { readLawyerVerificationRecord, resetLawyerVerificationStoreForTests } from '@/app/services/auth/lawyerVerificationStore';
import {
    activateLocalDevWorkLawyerSession,
    tryActivateLocalDevWorkLawyerSession,
} from '@/app/services/auth/localDevWorkLawyer';
import { clearExplicitLocalGuest } from '@/app/services/auth/localGuestSession';

describe('localDevWorkLawyer', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
        clearExplicitDevUnlock();
        clearExplicitLocalGuest();
        resetLawyerVerificationStoreForTests();
    });

    it('activateLocalDevWorkLawyerSession يبني محامياً موثّقاً لا ضيفاً', () => {
        const session = activateLocalDevWorkLawyerSession();
        expect(session.user.id).toBe(DEV_UNLOCK_LAWYER_ID);
        expect(session.user.id).not.toBe('guest-lawyer-1');
        expect(isExplicitDevUnlock()).toBe(true);
        expect(hasAcceptedCurrentLegalTerms()).toBe(true);
        expect(readLawyerVerificationRecord(DEV_UNLOCK_LAWYER_ID)?.status).toBe('active');
    });

    it('tryActivate لا يعمل خارج MODE=development', () => {
        vi.stubEnv('MODE', 'test');
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        expect(tryActivateLocalDevWorkLawyerSession()).toBeNull();
    });

    it('tryActivate يعمل في التطوير المحلي', () => {
        vi.stubEnv('MODE', 'development');
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        const session = tryActivateLocalDevWorkLawyerSession();
        expect(session?.user.id).toBe(DEV_UNLOCK_LAWYER_ID);
    });
});
