import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { restrictionMock, ensureProfileMock, ensurePendingMock, OPEN_RESTRICTION, LOCKED_RESTRICTION } =
    vi.hoisted(() => {
        const OPEN_RESTRICTION = {
            loginAllowed: true,
            frozen: false,
            freezeUntil: null as string | null,
            loginUntil: null as string | null,
            deleted: false,
        };
        const LOCKED_RESTRICTION = { ...OPEN_RESTRICTION, loginAllowed: false };
        return {
            OPEN_RESTRICTION,
            LOCKED_RESTRICTION,
            restrictionMock: vi.fn(async () => OPEN_RESTRICTION),
            ensureProfileMock: vi.fn(async () => undefined),
            ensurePendingMock: vi.fn(async () => false),
        };
    });

vi.mock('../../security/wifeUserStatus.ts', () => ({
    getWifeUserRestrictionLive: (...args: unknown[]) => restrictionMock(...args),
    ensureLawyerProfileRow: (...args: unknown[]) => ensureProfileMock(...args),
    resetWifeUserStatusCacheForTests: vi.fn(),
}));

vi.mock('../../security/headquartersConnectionSignal.ts', () => ({
    recordHeadquartersConnectionSignal: vi.fn(async () => undefined),
}));

vi.mock('../lawyer-verification/ensurePendingLawyerVerificationKv.ts', () => ({
    ensurePendingLawyerVerificationKv: (...args: unknown[]) => ensurePendingMock(...args),
    seedMissingPendingLawyerVerifications: vi.fn(async () => 0),
}));

import { POST } from './route.ts';
import { resetWifeRateLimitStoreForTests } from '../../security/wifeRateLimitStore.ts';
import { buildFakeJwt } from '@/app/security/__tests__/wifeRedTeamHelpers.ts';
import { LEGAL_TERMS_ACCEPTANCE_VERSION } from '@/app/services/auth/legalTermsVersion.ts';

const originalFetch = globalThis.fetch;

function loginRequest(
    email: string,
    ip: string,
    password = 'wrong-password',
    extraHeaders: Record<string, string> = {},
): Request {
    return new Request('https://app.test/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
            'x-forwarded-proto': 'https',
            ...extraHeaders,
        },
        body: JSON.stringify({ email, password, termsVersion: LEGAL_TERMS_ACCEPTANCE_VERSION }),
    });
}

/** ترفض Supabase الاعتماد دائماً حتى يقيس الاختبار الحدّ لا نتيجة المصادقة. */
function stubRejectingSupabase(): void {
    globalThis.fetch = vi.fn(
        async () =>
            new Response(JSON.stringify({ error_description: 'Invalid login credentials' }), { status: 400 }),
    ) as unknown as typeof fetch;
}

function stubSuccessfulGoTrue(userId = 'lawyer-uuid-1'): string {
    const access = buildFakeJwt({
        sub: userId,
        session_id: `sess-${userId}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
    });
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/auth/v1/token')) {
            const body = JSON.parse(String(init?.body ?? '{}')) as { email?: string };
            (globalThis as { __lastLoginBody?: { email?: string } }).__lastLoginBody = body;
            return new Response(
                JSON.stringify({
                    access_token: access,
                    refresh_token: 'refresh-1',
                    expires_in: 3600,
                    user: { id: userId, email: body.email },
                }),
                { status: 200 },
            );
        }
        if (url.includes('/auth/v1/logout')) {
            return new Response('{}', { status: 204 });
        }
        return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;
    return access;
}

async function statusesFor(count: number, email: string, ip: string): Promise<number[]> {
    const statuses: number[] = [];
    for (let i = 0; i < count; i++) {
        statuses.push((await POST(loginRequest(email, ip))).status);
    }
    return statuses;
}

describe('login route rate limiting', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        delete process.env.WIFE_REDIS_REST_URL;
        delete process.env.WIFE_REDIS_REST_TOKEN;
        resetWifeRateLimitStoreForTests();
        restrictionMock.mockResolvedValue(OPEN_RESTRICTION);
        stubRejectingSupabase();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        resetWifeRateLimitStoreForTests();
        vi.restoreAllMocks();
        restrictionMock.mockResolvedValue(OPEN_RESTRICTION);
    });

    it('stops password spraying against a single account', async () => {
        const statuses: number[] = [];
        for (let i = 0; i < 12; i++) {
            statuses.push((await POST(loginRequest('victim@example.com', `203.0.113.${i}`))).status);
        }

        expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
        expect(statuses.slice(10)).toEqual([429, 429]);
    });

    it('stops credential stuffing from a single source', async () => {
        const statuses: number[] = [];
        for (let i = 0; i < 32; i++) {
            statuses.push((await POST(loginRequest(`user${i}@example.com`, '198.51.100.7'))).status);
        }

        expect(statuses.filter((s) => s === 429)).toHaveLength(2);
        expect(statuses.slice(0, 30).every((s) => s === 401)).toBe(true);
    });

    it('tells a throttled client when to retry', async () => {
        await statusesFor(10, 'retry@example.com', '198.51.100.9');
        const blocked = await POST(loginRequest('retry@example.com', '198.51.100.9'));

        expect(blocked.status).toBe(429);
        expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
        await expect(blocked.json()).resolves.toMatchObject({ ok: false });
    });

    it('keeps unrelated accounts and sources unaffected', async () => {
        await statusesFor(11, 'blocked@example.com', '198.51.100.20');

        const other = await POST(loginRequest('other@example.com', '198.51.100.21'));
        expect(other.status).toBe(401);
    });

    it('degrades to counting in memory instead of locking everyone out when Redis is down', async () => {
        process.env.NODE_ENV = 'production';

        const first = await POST(loginRequest('prod@example.com', '198.51.100.30'));
        expect(first.status).toBe(401);

        const statuses = await statusesFor(11, 'prod@example.com', '198.51.100.30');
        expect(statuses).toContain(429);
    });

    it('does not leak raw GoTrue failure text', async () => {
        globalThis.fetch = vi.fn(
            async () =>
                new Response(JSON.stringify({ error_description: 'User not allowed from this IP' }), {
                    status: 400,
                }),
        ) as unknown as typeof fetch;

        const res = await POST(loginRequest('leak@example.com', '198.51.100.40'));
        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toEqual({ ok: false, error: 'Invalid credentials' });
    });
});

describe('login route session issuance', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        delete process.env.WIFE_REDIS_REST_URL;
        delete process.env.WIFE_REDIS_REST_TOKEN;
        resetWifeRateLimitStoreForTests();
        restrictionMock.mockResolvedValue(OPEN_RESTRICTION);
        ensureProfileMock.mockResolvedValue(undefined);
        ensurePendingMock.mockReset();
        ensurePendingMock.mockResolvedValue(false);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        resetWifeRateLimitStoreForTests();
        vi.restoreAllMocks();
        restrictionMock.mockResolvedValue(OPEN_RESTRICTION);
    });

    it('sets HttpOnly cookies and never returns JWT in JSON', async () => {
        stubSuccessfulGoTrue('lawyer-uuid-1');
        const res = await POST(
            loginRequest('Lawyer@Gmail.com', '198.51.100.50', 'CorrectHorse9', {
                'x-wife-device-id': 'device-login-aa',
            }),
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.ok).toBe(true);
        expect(JSON.stringify(body)).not.toMatch(/access_token|refresh_token/);
        const cookies = res.headers.getSetCookie();
        expect(cookies.some((c) => c.includes('hami_access_token=') && c.includes('HttpOnly'))).toBe(true);
        expect(cookies.some((c) => c.includes('hami_refresh_token=') && c.includes('HttpOnly'))).toBe(true);
        expect((globalThis as { __lastLoginBody?: { email?: string } }).__lastLoginBody?.email).toBe(
            'lawyer@gmail.com',
        );
        expect(ensureProfileMock).toHaveBeenCalledWith('lawyer-uuid-1', 'lawyer');
    });

    it('يمرّر اعتماد المقر في app_metadata حتى لا يُزرع صف معلّق فوقه', async () => {
        const uid = '49d464e5-bd75-4105-bdb9-fd18fc647854';
        const access = buildFakeJwt({
            sub: uid,
            session_id: `sess-${uid}`,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url.includes('/auth/v1/token')) {
                const body = JSON.parse(String(init?.body ?? '{}')) as { email?: string };
                return new Response(
                    JSON.stringify({
                        access_token: access,
                        refresh_token: 'refresh-1',
                        expires_in: 3600,
                        user: {
                            id: uid,
                            email: body.email,
                            app_metadata: { verification_status: 'active' },
                        },
                    }),
                    { status: 200 },
                );
            }
            return new Response('{}', { status: 404 });
        }) as unknown as typeof fetch;

        const res = await POST(loginRequest('ok@gmail.com', '198.51.100.58', 'CorrectHorse9'));
        expect(res.status).toBe(200);
        expect(ensurePendingMock).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: uid,
                email: 'ok@gmail.com',
                appVerificationStatus: 'active',
            }),
        );
    });

    it('does not issue cookies when the subject cannot be resolved', async () => {
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes('/auth/v1/token')) {
                return new Response(
                    JSON.stringify({
                        access_token: 'not-a-jwt',
                        refresh_token: 'refresh-1',
                        expires_in: 3600,
                        user: {},
                    }),
                    { status: 200 },
                );
            }
            if (url.includes('/auth/v1/user')) {
                return new Response('{}', { status: 500 });
            }
            if (url.includes('/auth/v1/logout')) {
                return new Response('{}', { status: 204 });
            }
            return new Response('{}', { status: 404 });
        }) as unknown as typeof fetch;

        const res = await POST(loginRequest('ghost@gmail.com', '198.51.100.52', 'CorrectHorse9'));
        expect(res.status).toBe(503);
        await expect(res.json()).resolves.toEqual({ ok: false, error: 'Auth service unavailable' });
        const cookies = res.headers.getSetCookie();
        expect(cookies.some((c) => c.includes('hami_access_token=') && !c.includes('Max-Age=0'))).toBe(
            false,
        );
        expect(vi.mocked(globalThis.fetch).mock.calls.some((call) => String(call[0]).includes('/auth/v1/logout'))).toBe(
            true,
        );
    });

    it('uses JWT sub when the grant omits user and still enforces the ban', async () => {
        restrictionMock.mockResolvedValue(LOCKED_RESTRICTION);
        const access = buildFakeJwt({
            sub: 'jwt-sub-banned-1',
            session_id: 'sess-jwt-sub-banned-1',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes('/auth/v1/token')) {
                return new Response(
                    JSON.stringify({
                        access_token: access,
                        refresh_token: 'refresh-1',
                        expires_in: 3600,
                    }),
                    { status: 200 },
                );
            }
            if (url.includes('/auth/v1/logout')) {
                return new Response('{}', { status: 204 });
            }
            return new Response('{}', { status: 404 });
        }) as unknown as typeof fetch;

        const res = await POST(loginRequest('banned-jwt@gmail.com', '198.51.100.53', 'CorrectHorse9'));
        expect(res.status).toBe(403);
        expect(restrictionMock).toHaveBeenCalledWith('jwt-sub-banned-1');
        expect(res.headers.getSetCookie().some((c) => c.includes('hami_access_token='))).toBe(false);
    });

    it('seeds a lawyer profile even if metadata claims client', async () => {
        const access = stubSuccessfulGoTrue('client-uuid-1');
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes('/auth/v1/token')) {
                return new Response(
                    JSON.stringify({
                        access_token: access,
                        refresh_token: 'refresh-1',
                        expires_in: 3600,
                        user: {
                            id: 'client-uuid-1',
                            email: 'client@gmail.com',
                            user_metadata: { accountType: 'client' },
                        },
                    }),
                    { status: 200 },
                );
            }
            return new Response('{}', { status: 404 });
        }) as unknown as typeof fetch;

        const res = await POST(loginRequest('client@gmail.com', '198.51.100.54', 'CorrectHorse9'));
        expect(res.status).toBe(200);
        expect(ensureProfileMock).toHaveBeenCalledWith('client-uuid-1', 'lawyer');
    });

    it('rejects a body without an email address before contacting GoTrue', async () => {
        stubRejectingSupabase();
        const res = await POST(loginRequest('not-an-email', '198.51.100.55', 'CorrectHorse9'));
        expect(res.status).toBe(400);
        expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
    });

    it('rejects banned accounts without setting session cookies', async () => {
        restrictionMock.mockResolvedValue(LOCKED_RESTRICTION);
        stubSuccessfulGoTrue('banned-uuid-1');
        const res = await POST(loginRequest('banned@gmail.com', '198.51.100.51', 'CorrectHorse9'));
        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toMatchObject({
            ok: false,
            error: expect.stringMatching(/قفل الدخول|أُقفل الحساب/),
            code: 'ACCOUNT_LOCKED',
        });
        const cookies = res.headers.getSetCookie();
        expect(cookies.some((c) => c.includes('hami_access_token=') && !c.includes('Max-Age=0'))).toBe(
            false,
        );
    });

    it('rejects a missing terms version before contacting GoTrue', async () => {
        stubRejectingSupabase();
        const res = await POST(
            new Request('https://app.test/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-forwarded-for': '198.51.100.56',
                    'x-forwarded-proto': 'https',
                },
                body: JSON.stringify({ email: 'ok@gmail.com', password: 'CorrectHorse9' }),
            }),
        );
        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toMatchObject({ ok: false, code: 'TERMS_REQUIRED' });
        expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
    });
});
