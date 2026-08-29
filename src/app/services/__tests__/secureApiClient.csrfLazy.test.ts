import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setWifeNativeFetchForTests } from '@/app/security/wifeNativeFetch';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(async () => ({ data: { session: null } })),
    fetchBffWifeSignedHeaders: vi.fn(async () => ({
        'X-WIFE-Session': 'server-session',
        'X-WIFE-Signature': 'server-signature',
        'X-WIFE-Timestamp': '1',
        'X-WIFE-Nonce': 'nonce-1',
    })),
    ensureCsrfSessionReady: vi.fn(async () => undefined),
}));

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        auth: {
            getSession: mocks.getSession,
        },
    },
}));

vi.mock('@/app/security/csrfSession', () => ({
    readCsrfTokenFromDocument: vi.fn(() => 'csrf-from-doc'),
}));

vi.mock('@/app/utils/bffAuthFlags', () => ({
    isBffAuthEnabled: () => true,
}));

vi.mock('@/app/utils/bffWifeSign', () => ({
    fetchBffWifeSignedHeaders: mocks.fetchBffWifeSignedHeaders,
    isWifeSignCircuitOpen: () => false,
    resetWifeSignCircuitForTests: () => undefined,
    clearWifeSignAuthCircuit: () => undefined,
}));

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: (...args: unknown[]) => mocks.ensureCsrfSessionReady(...args),
    invalidateCsrfSessionReady: vi.fn(),
}));

vi.mock('@/app/services/settings/localOnlyGuard', () => ({
    assertNetworkAllowed: () => undefined,
}));

vi.mock('@/app/services/auth/lawyerAccountStatus', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/auth/lawyerAccountStatus')>();
    return {
        ...actual,
        canUseForumNetworkFeatures: () => true,
        canUseServerBackedNetworkFeatures: () => true,
    };
});

vi.mock('@/app/utils/liveAuthUserId', () => ({
    getLiveAuthUserId: () => 'lawyer-csrf-1',
}));

vi.mock('@/app/runtime/sameOriginApiProbe', () => ({
    isSameOriginApiBlocked: () => false,
}));

vi.mock('../kvProxyGuard', () => ({
    isKvProxyUrl: () => false,
    fetchKvProxyGuarded: vi.fn(async () => new Response(null, { status: 200 })),
}));

vi.mock('@/app/utils/authStorage', () => ({
    readDevMockAccessToken: () => null,
    readPersistedSupabaseAuth: () => ({ user: null, session: null }),
    shouldUseServerSignedAuth: () => true,
    isDevMockAccessToken: () => false,
}));

describe('SecureAPIClient CSRF lazy', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_BFF_AUTH', 'true');
        mocks.ensureCsrfSessionReady.mockClear();
        mocks.fetchBffWifeSignedHeaders.mockClear();
        Object.defineProperty(window, 'location', {
            value: { origin: 'http://localhost:5173' },
            configurable: true,
        });
        setWifeNativeFetchForTests(null);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        setWifeNativeFetchForTests(null);
    });

    it('يهيّئ CSRF قبل POST موقَّع ولا يلمسه في GET', async () => {
        const nativeFetch = vi.fn(async () => new Response('{}', { status: 200 }));
        setWifeNativeFetchForTests(nativeFetch);
        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', { method: 'GET' });
        expect(mocks.ensureCsrfSessionReady).not.toHaveBeenCalled();

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 't' }),
        });
        expect(mocks.ensureCsrfSessionReady).toHaveBeenCalledTimes(1);
    });
});
