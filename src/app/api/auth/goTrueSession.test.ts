import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    readAccessTokenSubject,
    resolveGoTrueUserId,
    revokeGoTrueSession,
} from './goTrueSession.ts';
import { buildFakeJwt } from '@/app/security/__tests__/wifeRedTeamHelpers.ts';

describe('revokeGoTrueSession', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_ANON_KEY;
        vi.restoreAllMocks();
    });

    it('posts the access token to GoTrue logout when auth is configured', async () => {
        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        const fetchMock = vi.fn(async () => new Response('{}', { status: 204 }));
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        await revokeGoTrueSession('access-token-value-here');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(String(url)).toContain('/auth/v1/logout?scope=global');
        expect(init.method).toBe('POST');
        expect(new Headers(init.headers).get('Authorization')).toBe('Bearer access-token-value-here');
    });

    it('no-ops without configuration or token', async () => {
        const fetchMock = vi.fn();
        globalThis.fetch = fetchMock as unknown as typeof fetch;
        await revokeGoTrueSession('   ');
        await revokeGoTrueSession(null);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('can revoke only the local session when asked', async () => {
        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        const fetchMock = vi.fn(async () => new Response('{}', { status: 204 }));
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        await revokeGoTrueSession('access-token-value-here', { scope: 'local' });

        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/v1/logout?scope=local');
    });
});

describe('resolveGoTrueUserId', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_ANON_KEY;
        vi.restoreAllMocks();
    });

    it('prefers grant user id then JWT sub then /auth/v1/user', async () => {
        const token = buildFakeJwt({
            sub: 'jwt-sub-1',
            session_id: 'sess-1',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        expect(readAccessTokenSubject(token)).toBe('jwt-sub-1');
        expect(await resolveGoTrueUserId(token, { id: 'grant-id-1' })).toBe('grant-id-1');
        expect(await resolveGoTrueUserId(token, {})).toBe('jwt-sub-1');

        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        const fetchMock = vi.fn(
            async () => new Response(JSON.stringify({ id: 'fetched-id-1' }), { status: 200 }),
        );
        globalThis.fetch = fetchMock as unknown as typeof fetch;
        await expect(resolveGoTrueUserId('not-a-jwt', {})).resolves.toBe('fetched-id-1');
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/v1/user');
    });
});
