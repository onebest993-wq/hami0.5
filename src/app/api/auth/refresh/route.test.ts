import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { restrictionMock, OPEN_RESTRICTION, LOCKED_RESTRICTION } = vi.hoisted(() => {
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
    };
});

vi.mock('../../security/wifeUserStatus.ts', () => ({
    getWifeUserRestrictionLive: (...args: unknown[]) => restrictionMock(...args),
}));

vi.mock('../../security/headquartersConnectionSignal.ts', () => ({
    recordHeadquartersConnectionSignal: vi.fn(async () => undefined),
}));

import { POST } from './route.ts';
import { buildFakeJwt } from '@/app/security/__tests__/wifeRedTeamHelpers.ts';
import { buildRefreshSetCookie } from '../../security/sessionCookie.ts';

const originalFetch = globalThis.fetch;

function refreshRequest(refreshToken: string): Request {
    return new Request('https://app.test/api/auth/refresh', {
        method: 'POST',
        headers: {
            cookie: buildRefreshSetCookie(refreshToken, true),
            'x-forwarded-proto': 'https',
        },
    });
}

describe('refresh route live status', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        restrictionMock.mockResolvedValue(OPEN_RESTRICTION);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
        restrictionMock.mockResolvedValue(OPEN_RESTRICTION);
    });

    it('rotates cookies when the account is still active', async () => {
        const access = buildFakeJwt({
            sub: 'refresh-user-1',
            session_id: 'sess-refresh-1',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
            if (String(input).includes('/auth/v1/token')) {
                return new Response(
                    JSON.stringify({
                        access_token: access,
                        refresh_token: 'refresh-rotated',
                        expires_in: 3600,
                    }),
                    { status: 200 },
                );
            }
            return new Response('{}', { status: 404 });
        }) as unknown as typeof fetch;

        const res = await POST(refreshRequest('refresh-old'));
        expect(res.status).toBe(200);
        const cookies = res.headers.getSetCookie();
        expect(cookies.some((c) => c.includes('hami_access_token=') && c.includes('HttpOnly'))).toBe(true);
        expect(restrictionMock).toHaveBeenCalledWith('refresh-user-1');
    });

    it('clears cookies and revokes GoTrue when the account is banned', async () => {
        restrictionMock.mockResolvedValue(LOCKED_RESTRICTION);
        const access = buildFakeJwt({
            sub: 'banned-refresh-1',
            session_id: 'sess-banned-refresh-1',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes('/auth/v1/token')) {
                return new Response(
                    JSON.stringify({ access_token: access, refresh_token: 'refresh-rotated' }),
                    { status: 200 },
                );
            }
            if (url.includes('/auth/v1/logout')) {
                return new Response('{}', { status: 204 });
            }
            return new Response('{}', { status: 404 });
        }) as unknown as typeof fetch;

        const res = await POST(refreshRequest('refresh-old'));
        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toMatchObject({
            ok: false,
            error: expect.stringMatching(/قفل الدخول|أُقفل الحساب/),
            code: 'ACCOUNT_LOCKED',
        });
        const cookies = res.headers.getSetCookie();
        expect(cookies.some((c) => c.includes('hami_access_token=') && c.includes('Max-Age=0'))).toBe(
            true,
        );
        expect(
            vi.mocked(globalThis.fetch).mock.calls.some((call) => String(call[0]).includes('/auth/v1/logout')),
        ).toBe(true);
    });
});
