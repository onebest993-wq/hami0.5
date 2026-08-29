import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setWifeNativeFetchForTests } from '@/app/security/wifeNativeFetch';
import { clearBffCryptoWrapCredential } from '@/app/utils/bffCryptoSession';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(async () => ({ data: { session: null } })),
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

/*
 * ورقتان بدل المحور: `SecureAPIClient` صار يستورد الرايةَ من `bffAuthFlags`
 * والتوقيعَ من `bffWifeSign` بعد قطع دائرة الاستيراد على نواة الشبكة. ومحاكاة
 * `bffAuthClient` كانت تُصيب موضعاً لم يعد يعبره.
 */
vi.mock('@/app/utils/bffAuthFlags', () => ({
    isBffAuthEnabled: () => import.meta.env.VITE_BFF_AUTH === 'true',
}));

vi.mock('@/app/utils/bffWifeSign', () => ({
    fetchBffWifeSignedHeaders: mocks.fetchBffWifeSignedHeaders,
    isWifeSignCircuitOpen: () => false,
    resetWifeSignCircuitForTests: () => undefined,
    clearWifeSignAuthCircuit: () => undefined,
}));

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: vi.fn(async () => undefined),
    invalidateCsrfSessionReady: vi.fn(),
}));

vi.mock('../RequestSigningService', () => ({
    RequestSigningService: {
        createSignedHeaders: mocks.createSignedHeaders,
    },
}));

vi.mock('@/app/services/settings/localOnlyGuard', () => ({
    assertNetworkAllowed: mocks.assertNetworkAllowed,
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
    getLiveAuthUserId: () => 'lawyer-bff-1',
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
    /* اختبار BFF: جلسة كوكي بلا JWT محلي — التوقيع الخادمي كما hasBffCryptoSession */
    shouldUseServerSignedAuth: () => true,
    isDevMockAccessToken: (token: string) => String(token).startsWith('dev-access-token-'),
}));

describe('SecureAPIClient BFF signing', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_BFF_AUTH', 'true');
        mocks.getSession.mockResolvedValue({ data: { session: null } });
        mocks.fetchBffWifeSignedHeaders.mockResolvedValue({
            'X-WIFE-Session': 'server-session',
            'X-WIFE-Signature': 'server-signature',
            'X-WIFE-Timestamp': '1',
            'X-WIFE-Nonce': 'nonce-1',
        });
        mocks.createSignedHeaders.mockReset();
        mocks.assertNetworkAllowed.mockReset();
        Object.defineProperty(window, 'location', {
            value: { origin: 'http://localhost:5173' },
            configurable: true,
        });
        setWifeNativeFetchForTests(null);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
        setWifeNativeFetchForTests(null);
    });

    it('يفضّل التوقيع الخادمي في وضع BFF ولا يلمس توقيع العميل', async () => {
        const nativeFetch = vi.fn(async () => new Response('{}', { status: 200 }));
        setWifeNativeFetchForTests(nativeFetch);

        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'test' }),
        });

        expect(mocks.fetchBffWifeSignedHeaders).toHaveBeenCalledTimes(1);
        expect(mocks.createSignedHeaders).not.toHaveBeenCalled();
        expect(nativeFetch).toHaveBeenCalledTimes(1);

        const [, init] = nativeFetch.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
        const headers = new Headers(init.headers);
        expect(headers.get('X-WIFE-Signature')).toBe('server-signature');
        expect(headers.get('X-WIFE-Session')).toBe('server-session');
    });

    it('يبقي التوقيع الخادمي حتى لو وُجد JWT في ذاكرة العميل ولا يرسل Bearer', async () => {
        mocks.getSession.mockResolvedValue({
            data: { session: { access_token: 'client-jwt-should-not-sign' } },
        });
        const nativeFetch = vi.fn(async () => new Response('{}', { status: 200 }));
        setWifeNativeFetchForTests(nativeFetch);

        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'test' }),
        });

        expect(mocks.fetchBffWifeSignedHeaders).toHaveBeenCalledTimes(1);
        expect(mocks.createSignedHeaders).not.toHaveBeenCalled();

        const [, init] = nativeFetch.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
        const headers = new Headers(init.headers);
        expect(headers.get('Authorization')).toBeNull();
        expect(headers.get('X-WIFE-Signature')).toBe('server-signature');
        expect(init.credentials).toBe('include');
    });

    it('يرسل كوكي الجلسة حتى لمسارات الإقلاع غير الموقَّعة', async () => {
        const nativeFetch = vi.fn(async () => new Response('{}', { status: 200 }));
        setWifeNativeFetchForTests(nativeFetch);
        const { SecureAPIClient, resetAuthPauseForTests } = await import('../SecureAPIClient.ts');
        resetAuthPauseForTests();

        await SecureAPIClient.fetchSecureResponse('/api/auth/session', { method: 'GET' });

        const [, init] = nativeFetch.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
        expect(init.credentials).toBe('include');
        expect(mocks.fetchBffWifeSignedHeaders).not.toHaveBeenCalled();
    });

    it('يلغي التوقيع إذا تجاوزت المهلة', async () => {
        vi.useFakeTimers();
        mocks.fetchBffWifeSignedHeaders.mockImplementation(async (input: { signal?: AbortSignal }) => {
            await new Promise<never>((_, reject) => {
                const fail = () => reject(new DOMException('Aborted', 'AbortError'));
                if (input.signal?.aborted) {
                    fail();
                    return;
                }
                input.signal?.addEventListener('abort', fail, { once: true });
            });
        });
        const nativeFetch = vi.fn(async () => new Response('{}', { status: 200 }));
        setWifeNativeFetchForTests(nativeFetch);

        try {
            const { SecureAPIClient } = await import('../SecureAPIClient.ts');
            const pending = SecureAPIClient.fetchSecureResponse('/api/admin/consultations', {
                method: 'GET',
            });
            await vi.advanceTimersByTimeAsync(0);
            const assertion = expect(pending).rejects.toThrow('انتهت مهلة الاتصال بالخادم');
            await vi.advanceTimersByTimeAsync(12_000);
            await assertion;
            expect(nativeFetch).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('يعيد محاولة مسارات المنتدى الحسّاسة مرة بعد 401 دون إيقاف الشبكة فوراً', async () => {
        const nativeFetch = vi.fn()
            .mockResolvedValueOnce(new Response('no', { status: 401 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        setWifeNativeFetchForTests(nativeFetch);
        const { SecureAPIClient, resetAuthPauseForTests } = await import('../SecureAPIClient.ts');
        resetAuthPauseForTests();

        await expect(
            SecureAPIClient.fetchSecure('/api/forum/stats', { method: 'GET' }),
        ).resolves.toEqual({ ok: true });
        expect(nativeFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('لا يعيد محاولة مسار المقر بعد 401 — الجلسة تُجهَّز قبل التركيب', async () => {
        const nativeFetch = vi.fn().mockResolvedValue(new Response('no', { status: 401 }));
        setWifeNativeFetchForTests(nativeFetch);
        const { SecureAPIClient, resetAuthPauseForTests } = await import('../SecureAPIClient.ts');
        resetAuthPauseForTests();

        await expect(
            SecureAPIClient.fetchSecure('/api/admin/consultations', { method: 'GET' }),
        ).rejects.toMatchObject({ status: 401 });
        expect(nativeFetch).toHaveBeenCalledTimes(1);
    });

    it('لا يستدعي wife-sign لجلسة dev mock في BFF — توقيع عميل فقط', async () => {
        clearBffCryptoWrapCredential();
        mocks.getSession.mockResolvedValue({
            data: { session: { access_token: 'dev-access-token-local' } },
        });
        mocks.createSignedHeaders.mockReturnValue({
            'X-WIFE-Signature': 'client-signature',
        });
        const nativeFetch = vi.fn(async () => new Response('{}', { status: 200 }));
        setWifeNativeFetchForTests(nativeFetch);

        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'test' }),
        });

        expect(mocks.fetchBffWifeSignedHeaders).not.toHaveBeenCalled();
        expect(mocks.createSignedHeaders).toHaveBeenCalledTimes(1);
        expect(nativeFetch).toHaveBeenCalledTimes(1);
    });
});
