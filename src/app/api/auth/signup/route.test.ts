import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../security/kvStoreAdmin.ts', () => ({
    kvSet: vi.fn(async () => undefined),
    kvGet: vi.fn(async () => null),
    kvGetByPrefix: vi.fn(async () => []),
}));

vi.mock('../../security/wifeUserStatus.ts', () => ({
    ensureLawyerProfileRow: vi.fn(async () => undefined),
    isUserActiveLive: vi.fn(async () => true),
}));

vi.mock('../../security/cryptoWrapServer.ts', () => ({
    deriveClientCryptoWrapCredential: vi.fn(async () => 'wrap'),
}));

vi.mock('../../security/headquartersConnectionSignal.ts', () => ({
    recordHeadquartersConnectionSignal: vi.fn(async () => undefined),
}));

import { POST } from './route.ts';
import { resetWifeRateLimitStoreForTests } from '../../security/wifeRateLimitStore.ts';
import { kvSet } from '../../security/kvStoreAdmin.ts';
import { buildFakeJwt } from '@/app/security/__tests__/wifeRedTeamHelpers.ts';
import { LEGAL_TERMS_ACCEPTANCE_VERSION } from '@/app/services/auth/legalTermsVersion.ts';

const originalFetch = globalThis.fetch;

function signupRequest(body: unknown, ip = '198.51.100.80'): Request {
    const payload =
        body && typeof body === 'object' && !Array.isArray(body)
            ? { termsVersion: LEGAL_TERMS_ACCEPTANCE_VERSION, ...(body as Record<string, unknown>) }
            : body;
    return new Request('https://app.test/api/auth/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
            'x-forwarded-proto': 'https',
        },
        body: JSON.stringify(payload),
    });
}

describe('signup route', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        resetWifeRateLimitStoreForTests();
        vi.mocked(kvSet).mockClear();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        resetWifeRateLimitStoreForTests();
        vi.restoreAllMocks();
    });

    it('does not leak raw GoTrue failure text', async () => {
        globalThis.fetch = vi.fn(
            async () =>
                new Response(JSON.stringify({ msg: 'Database error querying schema' }), { status: 500 }),
        ) as unknown as typeof fetch;
        const res = await POST(signupRequest({ email: 'ok@gmail.com', password: 'SecureLaw9' }));
        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ ok: false, error: 'Signup failed', code: 'SIGNUP_FAILED' });
    });

    it('lowercases email before GoTrue and never returns JWT in JSON', async () => {
        const access = buildFakeJwt({
            sub: 'new-user-1',
            session_id: 'sess-new-1',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            if (String(input).includes('/auth/v1/signup')) {
                const body = JSON.parse(String(init?.body ?? '{}')) as { email?: string };
                (globalThis as { __signupEmail?: string }).__signupEmail = body.email;
                return new Response(
                    JSON.stringify({
                        access_token: access,
                        refresh_token: 'refresh-1',
                        expires_in: 3600,
                        user: { id: 'new-user-1', email: body.email },
                    }),
                    { status: 200 },
                );
            }
            return new Response('{}', { status: 404 });
        }) as unknown as typeof fetch;

        const res = await POST(signupRequest({ email: 'Lawyer.New@Gmail.com', password: 'SecureLaw9' }));
        expect(res.status).toBe(200);
        const json = (await res.json()) as Record<string, unknown>;
        expect(json.ok).toBe(true);
        expect(json.sessionEstablished).toBe(true);
        expect(JSON.stringify(json)).not.toMatch(/access_token|refresh_token/);
        expect((globalThis as { __signupEmail?: string }).__signupEmail).toBe('lawyer.new@gmail.com');
        const cookies = res.headers.getSetCookie();
        expect(cookies.some((c) => c.includes('hami_access_token=') && c.includes('HttpOnly'))).toBe(true);
    });

    it('does not set cookies when tokens arrive without a subject', async () => {
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes('/auth/v1/signup')) {
                return new Response(
                    JSON.stringify({
                        access_token: 'not-a-jwt',
                        refresh_token: 'refresh-1',
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

        const res = await POST(signupRequest({ email: 'ghost@gmail.com', password: 'SecureLaw9' }));
        expect(res.status).toBe(200);
        const json = (await res.json()) as { sessionEstablished?: boolean };
        expect(json.sessionEstablished).toBe(false);
        expect(res.headers.getSetCookie().some((c) => c.includes('hami_access_token='))).toBe(false);
        expect(
            vi.mocked(globalThis.fetch).mock.calls.some((call) => String(call[0]).includes('/auth/v1/logout')),
        ).toBe(true);
    });

    it('rejects a missing terms version before contacting GoTrue', async () => {
        globalThis.fetch = vi.fn() as unknown as typeof fetch;
        const res = await POST(signupRequest({ email: 'ok@gmail.com', password: 'SecureLaw9', termsVersion: '' }));
        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toMatchObject({ ok: false, code: 'TERMS_REQUIRED' });
        expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
    });

    it('rejects a verification object without a valid bar-card preview', async () => {
        globalThis.fetch = vi.fn() as unknown as typeof fetch;
        const res = await POST(
            signupRequest({
                email: 'ok@gmail.com',
                password: 'SecureLaw9',
                verification: { hasIdFront: true, idFrontPreview: 'not-an-image' },
            }),
        );
        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toMatchObject({ ok: false, code: 'ID_FRONT_REQUIRED' });
        expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
    });

    it('writes bar-card verification onto the pending HQ record', async () => {
        const preview = 'data:image/png;base64,' + 'A'.repeat(80);
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            if (String(input).includes('/auth/v1/signup')) {
                return new Response(
                    JSON.stringify({
                        user: { id: 'new-user-bar-1', email: 'ok@gmail.com' },
                    }),
                    { status: 200 },
                );
            }
            void init;
            return new Response('{}', { status: 404 });
        }) as unknown as typeof fetch;

        const res = await POST(
            signupRequest({
                email: 'ok@gmail.com',
                password: 'SecureLaw9',
                data: { fullName: 'علي محمد حسن', lawyerBarRoom: 'بغداد' },
                verification: {
                    hasIdFront: true,
                    hasIdBack: true,
                    hasFaceSelfie: false,
                    faceAssistOptedIn: false,
                    idFrontPreview: preview,
                    idBackPreview: preview,
                },
            }),
        );
        expect(res.status).toBe(200);
        const json = (await res.json()) as { userId?: string };
        expect(json.userId).toBe('new-user-bar-1');
        expect(vi.mocked(kvSet)).toHaveBeenCalled();
        const [, record] = vi.mocked(kvSet).mock.calls.find((call) =>
            String(call[0]).includes('lawyer-verification:new-user-bar-1'),
        ) as [string, { hasIdFront?: boolean; idFrontPreview?: string; status?: string }];
        expect(record.status).toBe('pending');
        expect(record.hasIdFront).toBe(true);
        expect(record.idFrontPreview).toContain('data:image/png;base64,');
        expect(record.idBackPreview).toContain('data:image/png;base64,');
    });

    it('maps GoTrue confirmation mail 429 to an Arabic rate-limit, not Signup failed', async () => {
        globalThis.fetch = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({
                        msg: 'email rate limit exceeded',
                        error_code: 'over_email_send_rate_limit',
                    }),
                    { status: 429 },
                ),
        ) as unknown as typeof fetch;
        const res = await POST(signupRequest({ email: 'ok@gmail.com', password: 'SecureLaw9' }));
        expect(res.status).toBe(429);
        const json = (await res.json()) as { error?: string; code?: string };
        expect(json.code).toBe('EMAIL_RATE_LIMIT');
        expect(json.error).toMatch(/حد رسائل/);
        expect(json.error).not.toMatch(/Signup failed/i);
    });

    it('creates a confirmed lawyer via Admin API so signup does not send Auth mail', async () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_test_service_role_key';
        const access = buildFakeJwt({
            sub: 'new-user-admin-1',
            session_id: 'sess-admin-1',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url.includes('/auth/v1/admin/users')) {
                const body = JSON.parse(String(init?.body ?? '{}')) as {
                    email_confirm?: boolean;
                    email?: string;
                };
                expect(body.email_confirm).toBe(true);
                return new Response(
                    JSON.stringify({ id: 'new-user-admin-1', email: body.email }),
                    { status: 200 },
                );
            }
            if (url.includes('/auth/v1/token')) {
                return new Response(
                    JSON.stringify({
                        access_token: access,
                        refresh_token: 'refresh-admin-1',
                        expires_in: 3600,
                        user: { id: 'new-user-admin-1', email: 'ok@gmail.com' },
                    }),
                    { status: 200 },
                );
            }
            if (url.includes('/auth/v1/signup')) {
                return new Response(JSON.stringify({ msg: 'signup must not be used' }), { status: 500 });
            }
            return new Response('{}', { status: 404 });
        }) as unknown as typeof fetch;

        const res = await POST(signupRequest({ email: 'ok@gmail.com', password: 'SecureLaw9' }));
        expect(res.status).toBe(200);
        const json = (await res.json()) as { ok?: boolean; sessionEstablished?: boolean; userId?: string };
        expect(json.ok).toBe(true);
        expect(json.userId).toBe('new-user-admin-1');
        expect(json.sessionEstablished).toBe(true);
        expect(
            vi.mocked(globalThis.fetch).mock.calls.some((call) =>
                String(call[0]).includes('/auth/v1/signup'),
            ),
        ).toBe(false);
        expect(
            vi.mocked(globalThis.fetch).mock.calls.some((call) =>
                String(call[0]).includes('/auth/v1/admin/users'),
            ),
        ).toBe(true);
    });
});
