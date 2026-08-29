import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(async () => ({ data: { session: null as { access_token?: string } | null } })),
}));

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        auth: {
            getSession: mocks.getSession,
        },
    },
}));

import { getCurrentAccessToken } from '@/app/services/SecureAPIClient';
import { clearExplicitDevUnlock } from '@/app/services/auth/devUnlockSession';
import { clearExplicitLocalGuest } from '@/app/services/auth/localGuestSession';

describe('getCurrentAccessToken', () => {
    beforeEach(() => {
        mocks.getSession.mockResolvedValue({ data: { session: null } });
        localStorage.clear();
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
    });

    afterEach(() => {
        localStorage.clear();
        clearExplicitDevUnlock();
        clearExplicitLocalGuest();
        vi.unstubAllEnvs();
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
    });

    it('uses the live Supabase session when present', async () => {
        mocks.getSession.mockResolvedValue({
            data: { session: { access_token: 'live-session-token-with-length-ok' } },
        });
        await expect(getCurrentAccessToken()).resolves.toBe('live-session-token-with-length-ok');
    });

    it('reads persisted localStorage when getSession has not hydrated', async () => {
        localStorage.setItem(
            'sb-wife-hydrate-auth-token',
            JSON.stringify({
                access_token: 'stored-jwt-before-hydrate-okxx',
                user: { id: 'u-hydrate-1' },
            }),
        );
        await expect(getCurrentAccessToken()).resolves.toBe('stored-jwt-before-hydrate-okxx');
    });

    it('does not invent a token when the shell is closed', async () => {
        await expect(getCurrentAccessToken()).resolves.toBeNull();
    });
});
