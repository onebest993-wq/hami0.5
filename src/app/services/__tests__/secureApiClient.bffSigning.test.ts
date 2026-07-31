import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(async () => ({ data: { session: null } })),
    bootstrapWifeClientSession: vi.fn(() => undefined),
    clearWifeClientSession: vi.fn(() => undefined),
    fetchBffWifeSignedHeaders: vi.fn(async () => ({})),
    createSignedHeaders: vi.fn(() => ({})),
    assertNetworkAllowed: vi.fn(() => undefined),
}));

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        auth: {
            getSession: mocks.getSession,
        },
    },
}));

vi.mock('@/app/security/csrfSession', () => ({
    readCsrfTokenFromDocument: vi.fn(() => null),
}));

vi.mock('@/app/security/wifeClientSession', () => ({
    bootstrapWifeClientSession: mocks.bootstrapWifeClientSession,
    clearWifeClientSession: mocks.clearWifeClientSession,
}));

vi.mock('@/app/utils/bffAuthClient', () => ({
    isBffAuthEnabled: () => import.meta.env.VITE_BFF_AUTH === 'true',
    fetchBffWifeSignedHeaders: mocks.fetchBffWifeSignedHeaders,
}));

vi.mock('../RequestSigningService', () => ({
    RequestSigningService: {
        createSignedHeaders: mocks.createSignedHeaders,
    },
}));

vi.mock('@/app/services/settings/localOnlyGuard', () => ({
    assertNetworkAllowed: mocks.assertNetworkAllowed,
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
}));

describe('SecureAPIClient BFF signing', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv('VITE_BFF_AUTH', 'true');
        mocks.getSession.mockResolvedValue({ data: { session: null } });
        mocks.fetchBffWifeSignedHeaders.mockResolvedValue({
            'X-WIFE-Session': 'server-session',
            'X-WIFE-Signature': 'server-signature',
            'X-WIFE-Timestamp': '1',
            'X-WIFE-Nonce': 'nonce-1',
        });
        mocks.bootstrapWifeClientSession.mockReset();
        mocks.createSignedHeaders.mockReset();
        mocks.assertNetworkAllowed.mockReset();
        Object.defineProperty(window, 'location', {
            value: { origin: 'http://localhost:5173' },
            configurable: true,
        });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
        delete (globalThis as Record<string | symbol, unknown>)[Symbol.for('WIFE_NATIVE_FETCH')];
    });

    it('يفضّل التوقيع الخادمي في وضع BFF ولا يلمس توقيع العميل', async () => {
        const nativeFetch = vi.fn(async () => new Response('{}', { status: 200 }));
        (globalThis as Record<string | symbol, unknown>)[Symbol.for('WIFE_NATIVE_FETCH')] = nativeFetch;

        const { SecureAPIClient } = await import('../SecureAPIClient');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'test' }),
        });

        expect(mocks.fetchBffWifeSignedHeaders).toHaveBeenCalledTimes(1);
        expect(mocks.bootstrapWifeClientSession).not.toHaveBeenCalled();
        expect(mocks.createSignedHeaders).not.toHaveBeenCalled();
        expect(nativeFetch).toHaveBeenCalledTimes(1);

        const [, init] = nativeFetch.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
        const headers = new Headers(init.headers);
        expect(headers.get('X-WIFE-Signature')).toBe('server-signature');
        expect(headers.get('X-WIFE-Session')).toBe('server-session');
    });
});
