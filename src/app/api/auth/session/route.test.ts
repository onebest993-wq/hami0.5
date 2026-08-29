import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../security/wifeValidator.ts', () => ({
    isTokenAuthorized: vi.fn(async () => false),
    wifeUnauthorizedResponse: vi.fn(({ reason }: { reason: string }) =>
        new Response(JSON.stringify({ ok: false, error: reason }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        }),
    ),
}));

vi.mock('../../security/cryptoWrapServer.ts', () => ({
    deriveClientCryptoWrapCredential: vi.fn(async () => 'wrap'),
}));

vi.mock('../../security/roleResolver.ts', () => ({
    isPlatformAdminUserId: vi.fn(async (_id: string, email?: string | null) =>
        String(email ?? '').trim().toLowerCase() === 'hami.apps@proton.me',
    ),
}));

import { GET } from './route.ts';
import { isTokenAuthorized } from '../../security/wifeValidator.ts';
import { buildAccessSetCookie, INCOMING_COOKIE_FALLBACK_HEADER } from '../../security/sessionCookie.ts';
import { buildFakeJwt } from '@/app/security/__tests__/wifeRedTeamHelpers.ts';

const originalFetch = globalThis.fetch;

describe('session route', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        vi.mocked(isTokenAuthorized).mockResolvedValue(false);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('returns an anonymous 200 when the cookie is missing', async () => {
        const res = await GET(new Request('https://app.test/api/auth/session'));
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ ok: true, user: null, isAdmin: false });
    });

    it('returns user without JWT fields when authorized', async () => {
        vi.mocked(isTokenAuthorized).mockResolvedValue(true);
        const access = buildFakeJwt({
            sub: 'sess-user-1',
            session_id: 'sess-1',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        globalThis.fetch = vi.fn(
            async () =>
                new Response(JSON.stringify({ id: 'sess-user-1', email: 'a@gmail.com' }), { status: 200 }),
        ) as unknown as typeof fetch;

        const res = await GET(
            new Request('https://app.test/api/auth/session', {
                headers: { cookie: buildAccessSetCookie(access, true) },
            }),
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.ok).toBe(true);
        expect((body.user as { id?: string })?.id).toBe('sess-user-1');
        expect(body.isAdmin).toBe(false);
        expect(JSON.stringify(body)).not.toMatch(/access_token|refresh_token/);
    });

    it('marks the platform master mailbox as isAdmin', async () => {
        vi.mocked(isTokenAuthorized).mockResolvedValue(true);
        const access = buildFakeJwt({
            sub: 'admin-sess',
            session_id: 'sess-admin',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        globalThis.fetch = vi.fn(
            async () =>
                new Response(JSON.stringify({ id: 'admin-sess', email: 'hami.apps@proton.me' }), {
                    status: 200,
                }),
        ) as unknown as typeof fetch;

        const res = await GET(
            new Request('https://app.test/api/auth/session', {
                headers: { cookie: buildAccessSetCookie(access, true) },
            }),
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.isAdmin).toBe(true);
    });

    it('accepts the adapter cookie fallback when Cookie was stripped', async () => {
        vi.mocked(isTokenAuthorized).mockResolvedValue(true);
        const access = buildFakeJwt({
            sub: 'admin-sess',
            session_id: 'sess-admin',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        globalThis.fetch = vi.fn(
            async () =>
                new Response(JSON.stringify({ id: 'admin-sess', email: 'hami.apps@proton.me' }), {
                    status: 200,
                }),
        ) as unknown as typeof fetch;

        const res = await GET(
            new Request('https://app.test/api/auth/session', {
                headers: { [INCOMING_COOKIE_FALLBACK_HEADER]: `hami_access_token=${access}` },
            }),
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.isAdmin).toBe(true);
    });
});
