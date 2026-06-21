import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { resolveInitialAuthState, shouldApplyGuestFallbackSession } from '../authBoot';

vi.mock('@/app/utils/bffAuthClient', () => ({
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
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
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

    it('shouldApplyGuestFallbackSession follows bypass flag', () => {
        expect(shouldApplyGuestFallbackSession()).toBe(false);
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        expect(shouldApplyGuestFallbackSession()).toBe(true);
    });
});
