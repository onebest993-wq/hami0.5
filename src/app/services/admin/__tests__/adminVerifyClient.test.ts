import { describe, expect, it, vi, afterEach } from 'vitest';
import { setWifeNativeFetchForTests, resetWifeNativeFetchForTests } from '@/app/security/wifeNativeFetch';
import { fetchHeadquartersAdminVerify } from '@/app/services/admin/adminVerifyClient';

const bffRefreshSessionMock = vi.hoisted(() => vi.fn(async () => false));

vi.mock('@/app/utils/bffAuthClient', () => ({
    bffRefreshSession: (...args: unknown[]) => bffRefreshSessionMock(...args),
}));

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('fetchHeadquartersAdminVerify', () => {
    afterEach(() => {
        resetWifeNativeFetchForTests();
        bffRefreshSessionMock.mockReset();
        bffRefreshSessionMock.mockResolvedValue(false);
        vi.restoreAllMocks();
    });

    it('يمنح المقر من جلسة بريد المدير دون /api/admin/verify', async () => {
        const nativeFetch = vi.fn().mockResolvedValue(
            jsonResponse({
                ok: true,
                user: { id: 'live-uuid', email: 'hami.apps@proton.me' },
            }),
        );
        setWifeNativeFetchForTests(nativeFetch);

        await expect(fetchHeadquartersAdminVerify()).resolves.toEqual({
            ok: true,
            sessionLive: true,
            isAdmin: true,
            userId: 'live-uuid',
            reason: 'session_email',
        });

        expect(nativeFetch).toHaveBeenCalledTimes(1);
        expect(bffRefreshSessionMock).not.toHaveBeenCalled();
        const [url, init] = nativeFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/auth/session');
        expect(init.credentials).toBe('include');
        expect(new Headers(init.headers).get('authorization')).toBeNull();
    });

    it('يحترم isAdmin من الخادم حتى لو البريد ليس صندوق المدير', async () => {
        const nativeFetch = vi.fn().mockResolvedValue(
            jsonResponse({
                ok: true,
                isAdmin: true,
                user: { id: 'other-admin', email: 'ops@example.com' },
            }),
        );
        setWifeNativeFetchForTests(nativeFetch);
        await expect(fetchHeadquartersAdminVerify()).resolves.toMatchObject({
            isAdmin: true,
            sessionLive: true,
            reason: 'session_flag',
        });
    });

    it('يرفض جلسة محامٍ دون استدعاء verify', async () => {
        const nativeFetch = vi.fn().mockResolvedValue(
            jsonResponse({
                ok: true,
                isAdmin: false,
                user: { id: 'lawyer-1', email: 'lawyer@example.com' },
            }),
        );
        setWifeNativeFetchForTests(nativeFetch);
        await expect(fetchHeadquartersAdminVerify()).resolves.toEqual({
            ok: true,
            sessionLive: true,
            isAdmin: false,
            userId: 'lawyer-1',
            reason: 'not_admin',
        });
        expect(nativeFetch).toHaveBeenCalledTimes(1);
    });

    it('يلجأ إلى /api/admin/verify إن رُفضت الجلسة والتجديد', async () => {
        const nativeFetch = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse({ ok: false }, 401))
            .mockResolvedValueOnce(jsonResponse({ ok: true, isAdmin: true, reason: 'email_match' }));
        setWifeNativeFetchForTests(nativeFetch);

        await expect(fetchHeadquartersAdminVerify()).resolves.toEqual({
            ok: true,
            isAdmin: true,
            sessionLive: true,
            reason: 'email_match',
        });
        expect(bffRefreshSessionMock).toHaveBeenCalledTimes(1);
        expect(nativeFetch.mock.calls[1]?.[0]).toBe('/api/admin/verify');
    });

    it('يعيد الجلسة بعد تجديد كوكي التحديث ثم يمنح المقر', async () => {
        bffRefreshSessionMock.mockResolvedValueOnce(true);
        const nativeFetch = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse({ ok: false }, 401))
            .mockResolvedValueOnce(
                jsonResponse({
                    ok: true,
                    isAdmin: true,
                    user: { id: 'live-uuid', email: 'hami.apps@proton.me' },
                }),
            );
        setWifeNativeFetchForTests(nativeFetch);

        await expect(fetchHeadquartersAdminVerify()).resolves.toMatchObject({
            isAdmin: true,
            sessionLive: true,
            userId: 'live-uuid',
        });
        expect(nativeFetch.mock.calls.map((call) => call[0])).toEqual([
            '/api/auth/session',
            '/api/auth/session',
        ]);
    });

    it('لا يفتح المقر عندما تعيد الجلسة مستخدماً فارغاً', async () => {
        const nativeFetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true, user: null, isAdmin: false }));
        setWifeNativeFetchForTests(nativeFetch);
        await expect(fetchHeadquartersAdminVerify()).resolves.toEqual({
            ok: false,
            isAdmin: false,
            sessionLive: false,
            reason: 'no_live_session',
        });
        expect(nativeFetch).toHaveBeenCalledTimes(1);
        expect(bffRefreshSessionMock).not.toHaveBeenCalled();
    });

    it('لا يفتح المقر عندما لا توجد جلسة خادم حية', async () => {
        setWifeNativeFetchForTests(vi.fn().mockResolvedValue(jsonResponse({ ok: false }, 401)));
        await expect(fetchHeadquartersAdminVerify()).resolves.toEqual({
            ok: false,
            isAdmin: false,
            sessionLive: false,
            reason: 'no_live_session',
        });
    });
});
