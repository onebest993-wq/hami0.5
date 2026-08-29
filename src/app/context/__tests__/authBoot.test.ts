import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { resolveInitialAuthState, shouldApplyGuestFallbackSession, shouldHoldAuthGateUntilSessionProbe, shouldRestoreGuestWhenServerHasNoSession, shouldKeepStoredNonGuestDevMock } from '../authBoot';
import { markExplicitLocalGuest, clearExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import {
    clearExplicitDevUnlock,
    DEV_UNLOCK_LAWYER_ID,
    markExplicitDevUnlock,
} from '@/app/services/auth/devUnlockSession';
import * as authStorage from '@/app/utils/authStorage';

vi.mock('@/app/utils/bffAuthFlags', () => ({
    isBffAuthEnabled: vi.fn(() => false),
}));

vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: vi.fn(() => ({ user: null, session: null })),
    readDevMockUser: vi.fn(() => null),
    readDevMockAccessToken: vi.fn(() => null),
    clearDevMockAuth: vi.fn(),
}));

describe('authBoot', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
        clearExplicitLocalGuest();
        clearExplicitDevUnlock();
        vi.mocked(isBffAuthEnabled).mockReturnValue(false);
        vi.mocked(authStorage.readDevMockUser).mockReturnValue(null);
        vi.mocked(authStorage.readDevMockAccessToken).mockReturnValue(null);
        vi.mocked(authStorage.readPersistedSupabaseAuth).mockReturnValue({ user: null, session: null });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
        clearExplicitLocalGuest();
        clearExplicitDevUnlock();
    });

    it('does not auto-create guest when bypass is off and no session', () => {
        const boot = resolveInitialAuthState();
        expect(boot.user).toBeNull();
        expect(boot.session).toBeNull();
    });

    it('creates guest when VITE_SHELL_AUTH_OPEN=true', () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        const boot = resolveInitialAuthState();
        expect(boot.user?.id).toBe(GUEST_LAWYER_ID);
        expect(boot.session?.user?.id).toBe(GUEST_LAWYER_ID);
    });

    it('يفضّل محامياً مزروعاً غير ضيف عند فتح الشِل (مسار E2E المنتدى)', () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        vi.mocked(isBffAuthEnabled).mockReturnValue(true);
        vi.mocked(authStorage.readDevMockUser).mockReturnValue({
            id: 'dev-user-uuid-1',
            email: 'e2e.forum@local',
            user_metadata: { accountType: 'lawyer', verificationStatus: 'active' },
            app_metadata: { verification_status: 'active', role: 'lawyer' },
        } as import('@supabase/supabase-js').User);
        vi.mocked(authStorage.readDevMockAccessToken).mockReturnValue('dev-access-token-dev-user-uuid-1');
        const boot = resolveInitialAuthState();
        expect(boot.user?.id).toBe('dev-user-uuid-1');
        expect(boot.session?.user?.id).toBe('dev-user-uuid-1');
    });

    it('restores explicit local guest when bypass is off', () => {
        markExplicitLocalGuest();
        const boot = resolveInitialAuthState();
        expect(boot.user?.id).toBe(GUEST_LAWYER_ID);
        expect(boot.session?.user?.id).toBe(GUEST_LAWYER_ID);
    });

    it('restores developer unlock session when bypass is off', () => {
        markExplicitDevUnlock();
        const boot = resolveInitialAuthState();
        expect(boot.user?.id).toBe(DEV_UNLOCK_LAWYER_ID);
        expect(boot.session?.user?.id).toBe(DEV_UNLOCK_LAWYER_ID);
    });

    it('shouldApplyGuestFallbackSession follows bypass flag', () => {
        expect(shouldApplyGuestFallbackSession()).toBe(false);
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        expect(shouldApplyGuestFallbackSession()).toBe(true);
    });

    it('shouldApplyGuestFallbackSession لا يُبقي الجلسة بعد خروج المطوّر', () => {
        markExplicitDevUnlock();
        expect(shouldApplyGuestFallbackSession()).toBe(false);
    });

    it('shouldKeepStoredNonGuestDevMock عند محامٍ غير ضيف في التخزين', async () => {
        const storage = await import('@/app/utils/authStorage');
        vi.mocked(storage.readDevMockUser).mockReturnValue({
            id: 'dev-user-uuid-1',
        } as import('@supabase/supabase-js').User);
        vi.mocked(storage.readDevMockAccessToken).mockReturnValue('dev-access-token-dev-user-uuid-1');
        expect(shouldKeepStoredNonGuestDevMock()).toBe(true);
    });

    it('shouldKeepStoredNonGuestDevMock false للضيف', async () => {
        const storage = await import('@/app/utils/authStorage');
        vi.mocked(storage.readDevMockUser).mockReturnValue({
            id: GUEST_LAWYER_ID,
        } as import('@supabase/supabase-js').User);
        vi.mocked(storage.readDevMockAccessToken).mockReturnValue('dev-access-token-guest-lawyer-1');
        expect(shouldKeepStoredNonGuestDevMock()).toBe(false);
    });

    it('shouldHoldAuthGateUntilSessionProbe عند BFF بلا مستخدم في الإقلاع', async () => {
        const flags = await import('@/app/utils/bffAuthFlags');
        vi.mocked(flags.isBffAuthEnabled).mockReturnValue(true);
        expect(shouldHoldAuthGateUntilSessionProbe({ user: null, session: null })).toBe(true);
        expect(
            shouldHoldAuthGateUntilSessionProbe({
                user: { id: 'u1' } as import('@supabase/supabase-js').User,
                session: null,
            }),
        ).toBe(false);
    });

    it('shouldHoldAuthGateUntilSessionProbe مغلق بدون BFF', () => {
        expect(shouldHoldAuthGateUntilSessionProbe({ user: null, session: null })).toBe(false);
    });
});
