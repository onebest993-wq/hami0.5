/**
 * أصل الـAPI — عقد البناء الأصلي.
 *
 * داخل WebView الخاص بـCapacitor أصل الوثيقة `https://localhost` خادمٌ محلي يخدّم
 * الأصول المحزومة فحسب، فكل مسار نسبي `/api/*` يرتدّ ٤٠٤ — وهي تسعة عشر عائلة
 * مسارات لا المصادقة وحدها. يضبط `VITE_API_ORIGIN` وجهةً مطلقة تجعل الحزمة
 * الأصلية تصل إلى الطرف الخلفي أصلاً.
 *
 * والشرط الأول لهذا العقد أن **الويب لا يتغيّر بمقدار حرف** حين تُترك القيمة فارغة.
 */
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
    supabase: { auth: { getSession: mocks.getSession } },
}));

vi.mock('@/app/security/csrfSession', () => ({
    readCsrfTokenFromDocument: vi.fn(() => 'csrf-from-doc'),
}));

vi.mock('@/app/utils/bffAuthFlags', () => ({ isBffAuthEnabled: () => true }));

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

vi.mock('@/app/utils/liveAuthUserId', () => ({ getLiveAuthUserId: () => 'lawyer-origin-1' }));

vi.mock('@/app/runtime/sameOriginApiProbe', () => ({ isSameOriginApiBlocked: () => false }));

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

/** آخر ما وصل إلى fetch: الوجهة وخياراتها */
function lastCall(fetchMock: ReturnType<typeof vi.fn>): { url: string; init: RequestInit } {
    const call = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    return { url: String(call[0]), init: call[1] };
}

describe('SecureAPIClient — أصل الـAPI', () => {
    let nativeFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.stubEnv('VITE_BFF_AUTH', 'true');
        mocks.ensureCsrfSessionReady.mockClear();
        mocks.fetchBffWifeSignedHeaders.mockClear();
        Object.defineProperty(window, 'location', {
            value: { origin: 'https://app.example.com' },
            configurable: true,
        });
        nativeFetch = vi.fn(async () => new Response('{}', { status: 200 }));
        setWifeNativeFetchForTests(nativeFetch as unknown as typeof fetch);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        setWifeNativeFetchForTests(null);
    });

    /* ــــ الويب: لا شيء يتغيّر ــــ */

    it('بلا ضبط: المسار النسبي يصل إلى fetch حرفياً كما ورد', async () => {
        vi.stubEnv('VITE_API_ORIGIN', '');
        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', { method: 'GET' });

        expect(lastCall(nativeFetch).url).toBe('/api/forum/posts');
    });

    it('بلا ضبط: كوكيز الجلسة تُرسل والتوقيع يُطبَّق كما كان', async () => {
        vi.stubEnv('VITE_API_ORIGIN', '');
        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', { method: 'GET' });

        const { init } = lastCall(nativeFetch);
        expect(init.credentials).toBe('include');
        expect(mocks.fetchBffWifeSignedHeaders).toHaveBeenCalled();
    });

    /* ــــ الأصلي: الوجهة تصير مطلقة، والحماية تبقى ــــ */

    it('مع ضبط: المسار النسبي يصير مطلقاً على أصل الـAPI', async () => {
        vi.stubEnv('VITE_API_ORIGIN', 'https://api.example.com');
        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', { method: 'GET' });

        expect(lastCall(nativeFetch).url).toBe('https://api.example.com/api/forum/posts');
    });

    /*
     * الأهمّ في الملف: تحويل الوجهة يجب ألّا يُسقط التوقيع ولا الكوكيز. لو سقط
     * أحدهما لخرجت الحزمة الأصلية تنادي الطرف الخلفي **بلا مصادقة** — وهو أسوأ
     * من ٤٠٤ الحالية، لأنه يبدو ناجحاً.
     */
    it('مع ضبط: التوقيع والكوكيز يبقيان — لا نداء بلا مصادقة', async () => {
        vi.stubEnv('VITE_API_ORIGIN', 'https://api.example.com');
        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', { method: 'GET' });

        const { init } = lastCall(nativeFetch);
        expect(init.credentials).toBe('include');
        expect(mocks.fetchBffWifeSignedHeaders).toHaveBeenCalled();
    });

    it('مع ضبط: POST يهيّئ CSRF كما في الويب', async () => {
        vi.stubEnv('VITE_API_ORIGIN', 'https://api.example.com');
        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 't' }),
        });

        expect(mocks.ensureCsrfSessionReady).toHaveBeenCalledTimes(1);
    });

    /* ــــ إعداد خاطئ: يُتجاهل ولا يُركَّب ــــ */

    it('قيمة تحمل مساراً: تُقرأ أصلاً فقط فلا ينتج عنوان مشوّه', async () => {
        vi.stubEnv('VITE_API_ORIGIN', 'https://api.example.com/v1/base');
        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', { method: 'GET' });

        /* لا `/v1/base/api/…` ولا `/v1/api/…` — الأصل وحده */
        expect(lastCall(nativeFetch).url).toBe('https://api.example.com/api/forum/posts');
    });

    it('قيمة غير صالحة: تُتجاهل ويعود السلوك نسبياً بدل أن ينكسر', async () => {
        vi.stubEnv('VITE_API_ORIGIN', 'not a url');
        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', { method: 'GET' });

        expect(lastCall(nativeFetch).url).toBe('/api/forum/posts');
    });

    it('بروتوكول غير http(s): يُتجاهل — لا capacitor:// ولا file://', async () => {
        vi.stubEnv('VITE_API_ORIGIN', 'capacitor://localhost');
        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('/api/forum/posts', { method: 'GET' });

        expect(lastCall(nativeFetch).url).toBe('/api/forum/posts');
    });

    /* ــــ النطاق: /api/ وحدها ــــ */

    it('عنوان مطلق لجهة أخرى لا يُمَسّ ولا تُرسل معه كوكيزنا', async () => {
        vi.stubEnv('VITE_API_ORIGIN', 'https://api.example.com');
        const { SecureAPIClient } = await import('../SecureAPIClient.ts');

        await SecureAPIClient.fetchSecureResponse('https://third-party.example.org/api/x', {
            method: 'GET',
        });

        const { url, init } = lastCall(nativeFetch);
        expect(url).toBe('https://third-party.example.org/api/x');
        expect(init.credentials).not.toBe('include');
    });
});
