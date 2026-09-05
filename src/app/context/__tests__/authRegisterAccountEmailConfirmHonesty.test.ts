import { beforeEach, describe, expect, it, vi } from 'vitest';

const bffSignupMock = vi.fn();
const bffLoginMock = vi.fn();
const markEmailConfirmationPendingMock = vi.fn();

vi.mock('@/app/utils/bffAuthFlags', () => ({
    isBffAuthEnabled: () => true,
}));

vi.mock('@/app/utils/bffAuthClient', () => ({
    bffLogin: (...args: unknown[]) => bffLoginMock(...args),
    bffSignup: (...args: unknown[]) => bffSignupMock(...args),
    bffLogout: vi.fn(async () => true),
    bootstrapBffCsrfSession: vi.fn(async () => undefined),
    fetchBffSession: vi.fn(async () => null),
    runBffLocalAuthMigration: vi.fn(async () => undefined),
    startBffSessionKeeper: vi.fn(() => () => undefined),
    stopBffSessionKeeper: vi.fn(),
    HAMI_BFF_SESSION_LOST_EVENT: 'hami:bff-session-lost',
}));

vi.mock('@/app/utils/authSupabaseLazy', () => ({
    attachSupabaseAuthListener: vi.fn(),
    signInWithPassword: vi.fn(),
    signOutSupabase: vi.fn(async () => undefined),
    signUpWithPassword: vi.fn(),
}));

vi.mock('@/app/services/auth/legalTermsAcceptance', () => ({
    assertLegalTermsAcceptedOrThrow: () => undefined,
    hasAcceptedCurrentLegalTerms: () => true,
    markLegalTermsAccepted: vi.fn(),
}));

vi.mock('@/app/services/auth/localGuestSession', () => ({
    clearExplicitLocalGuest: vi.fn(),
    markExplicitLocalGuest: vi.fn(),
}));

vi.mock('@/app/services/auth/devUnlockSession', () => ({
    clearExplicitDevUnlock: vi.fn(),
    markExplicitDevUnlock: vi.fn(),
    DEV_UNLOCK_LAWYER_ID: 'dev-lawyer',
    createDevUnlockLawyerSession: vi.fn(),
}));

vi.mock('@/app/services/auth/emailConfirmationClient', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@/app/services/auth/emailConfirmationClient')>();
    return {
        ...actual,
        markEmailConfirmationPending: (...args: unknown[]) =>
            markEmailConfirmationPendingMock(...args),
    };
});

vi.mock('@/app/utils/liveAuthUserId', () => ({
    setLiveAuthUserId: vi.fn(),
    resolveLiveAuthUserIdForStorage: () => null,
}));

vi.mock('@/app/utils/auditLog', () => ({
    logAction: vi.fn(async () => undefined),
}));

import { authRegisterLawyerAccount } from '@/app/context/authProviderRuntime';

const UID = '49d464e5-bd75-4105-bdb9-fd18fc647854';

const bindings = {
    setUser: vi.fn(),
    setSession: vi.fn(),
};

const account = { email: 'lawyer@gmail.com', password: 'SecureLaw9' };

describe('authRegisterLawyerAccount — صدق تأكيد البريد', () => {
    beforeEach(() => {
        bffSignupMock.mockReset();
        bffLoginMock.mockReset();
        markEmailConfirmationPendingMock.mockReset();
        bindings.setUser.mockReset();
        bindings.setSession.mockReset();
        bffSignupMock.mockResolvedValue({
            user: { id: UID },
            sessionEstablished: false,
            userId: UID,
        });
    });

    it('يعلن تأكيد البريد فقط حين يمنعه الخادم فعلاً', async () => {
        bffLoginMock.mockRejectedValue(new Error('Email not confirmed'));
        const result = await authRegisterLawyerAccount(account, bindings);
        expect(result.emailConfirmRequired).toBe(true);
        expect(result.pendingMessage).toMatch(/تأكيد البريد/);
        expect(markEmailConfirmationPendingMock).toHaveBeenCalledWith('lawyer@gmail.com');
    });

    it('لا ينسب فشل تجاوز حد المحاولات إلى تأكيد البريد', async () => {
        bffLoginMock.mockRejectedValue(new Error('Too many login attempts'));
        const result = await authRegisterLawyerAccount(account, bindings);
        expect(result.emailConfirmRequired).toBe(false);
        expect(result.pendingMessage).not.toMatch(/تأكيد البريد/);
        expect(markEmailConfirmationPendingMock).not.toHaveBeenCalled();
    });

    it('لا ينسب قفل الحساب إلى تأكيد البريد', async () => {
        bffLoginMock.mockRejectedValue(new Error('أُقفل الحساب من الإدارة'));
        const result = await authRegisterLawyerAccount(account, bindings);
        expect(result.emailConfirmRequired).toBe(false);
        expect(markEmailConfirmationPendingMock).not.toHaveBeenCalled();
    });

    it('لا يطلب تأكيداً عند نجاح الجلسة', async () => {
        bffLoginMock.mockResolvedValue({ id: UID });
        const result = await authRegisterLawyerAccount(account, bindings);
        expect(result.emailConfirmRequired).toBe(false);
        expect(result.userId).toBe(UID);
        expect(markEmailConfirmationPendingMock).not.toHaveBeenCalled();
    });
});
