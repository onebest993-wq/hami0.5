import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    setCsrfSessionTokenFromServer: vi.fn(),
    applyCsrfTokenToDocument: vi.fn(),
    clearCsrfSessionToken: vi.fn(),
    getOrCreateDeviceId: vi.fn(() => 'device-123'),
    clearWifeSigningKeyCache: vi.fn(),
    fetchBffWifeSignedHeaders: vi.fn(),
    readDevMockAccessToken: vi.fn(() => null),
}));

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        auth: {
            getSession: mocks.getSession,
        },
    },
}));

vi.mock('@/app/security/csrfSession', () => ({
    applyCsrfTokenToDocument: mocks.applyCsrfTokenToDocument,
    clearCsrfSessionToken: mocks.clearCsrfSessionToken,
    readCsrfTokenFromDocument: vi.fn(() => 'csrf-token'),
    setCsrfSessionTokenFromServer: mocks.setCsrfSessionTokenFromServer,
}));

vi.mock('@/app/security/deviceId', () => ({
    getOrCreateDeviceId: mocks.getOrCreateDeviceId,
}));

vi.mock('@/app/security/wifeSigningKeyCache', () => ({
    clearWifeSigningKeyCache: mocks.clearWifeSigningKeyCache,
}));

vi.mock('@/app/utils/authStorage', () => ({
    readDevMockAccessToken: mocks.readDevMockAccessToken,
}));

describe('wifeClientSession in BFF mode', () => {
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
        delete (globalThis as Record<string | symbol, unknown>)[Symbol.for('WIFE_NATIVE_FETCH')];
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
        delete (globalThis as Record<string | symbol, unknown>)[Symbol.for('WIFE_NATIVE_FETCH')];
    });

    it('bootstrap يجلب CSRF فقط ولا يحتفظ بجلسة توقيع عميل', async () => {
        const nativeFetch = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    ok: true,
                    csrfToken: 'csrf-from-server',
                    bootstrapMode: 'csrf-only',
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        );
        (globalThis as Record<string | symbol, unknown>)[Symbol.for('WIFE_NATIVE_FETCH')] = nativeFetch;

        const { bootstrapWifeClientSession, getWifeClientSession } = await import('../wifeClientSession');
        const session = await bootstrapWifeClientSession(true);

        expect(session).toBeNull();
        expect(getWifeClientSession()).toBeNull();
        expect(mocks.setCsrfSessionTokenFromServer).toHaveBeenCalledWith('csrf-from-server');
        expect(mocks.applyCsrfTokenToDocument).toHaveBeenCalledWith('csrf-from-server');

        const [url, init] = nativeFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/security/wife-session');
        const headers = new Headers(init.headers);
        expect(headers.get('x-wife-bootstrap-mode')).toBe('csrf-only');
    });

    it('revoke يعمل عبر التوقيع الخادمي حتى بدون جلسة عميل محلية', async () => {
        const nativeFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        (globalThis as Record<string | symbol, unknown>)[Symbol.for('WIFE_NATIVE_FETCH')] = nativeFetch;

        vi.doMock('@/app/utils/bffAuthClient', () => ({
            fetchBffWifeSignedHeaders: mocks.fetchBffWifeSignedHeaders,
        }));

        const { revokeWifeClientSession } = await import('../wifeClientSession');
        await revokeWifeClientSession();

        expect(mocks.fetchBffWifeSignedHeaders).toHaveBeenCalledWith({
            method: 'DELETE',
            url: '/api/security/wife-session',
            body: '',
            deviceId: 'device-123',
        });
        expect(nativeFetch).toHaveBeenCalledTimes(1);
    });
});
