import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearExplicitDevUnlock } from '@/app/services/auth/devUnlockSession';
import { clearExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import {
    readClientAccessTokenFallback,
    readDevShellAccessToken,
    readStoredAccessToken,
} from '@/app/services/auth/localSigningToken';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';

const AUTH_KEY = 'sb-wife-fallback-auth-token';
const MOCK_KEY = 'hami:dev-mock-access-token';

function seedPersistedJwt(token: string): void {
    localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({
            access_token: token,
            user: { id: 'persisted-user-1' },
        }),
    );
}

describe('localSigningToken', () => {
    afterEach(() => {
        localStorage.clear();
        clearExplicitDevUnlock();
        clearExplicitLocalGuest();
        vi.unstubAllEnvs();
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
    });

    it('reads persisted Supabase token without waiting for getSession', () => {
        seedPersistedJwt('persisted-jwt-token-with-length-ok');
        expect(readStoredAccessToken()).toBe('persisted-jwt-token-with-length-ok');
        expect(readClientAccessTokenFallback()).toBe('persisted-jwt-token-with-length-ok');
    });

    it('falls back to hami:dev-mock-access-token when no real JWT blob exists', () => {
        localStorage.setItem(MOCK_KEY, 'dev-access-token-e2e-wife-smoke-ok');
        expect(readStoredAccessToken()).toBe('dev-access-token-e2e-wife-smoke-ok');
    });

    it('prefers persisted JWT over mock key', () => {
        seedPersistedJwt('persisted-jwt-token-with-length-ok');
        localStorage.setItem(MOCK_KEY, 'dev-access-token-should-not-win-here');
        expect(readStoredAccessToken()).toBe('persisted-jwt-token-with-length-ok');
    });

    it('uses guest shell token when the UI is open without storage', () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        expect(readDevShellAccessToken()).toBe(`dev-access-token-${GUEST_LAWYER_ID}`);
        expect(readClientAccessTokenFallback()).toBe(`dev-access-token-${GUEST_LAWYER_ID}`);
    });

    it('returns null when shell is closed and nothing is stored', () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
        expect(readStoredAccessToken()).toBeNull();
        expect(readDevShellAccessToken()).toBeNull();
        expect(readClientAccessTokenFallback()).toBeNull();
    });
});
