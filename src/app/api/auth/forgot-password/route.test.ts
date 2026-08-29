import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route.ts';
import { resetWifeRateLimitStoreForTests } from '../../security/wifeRateLimitStore.ts';

const originalFetch = globalThis.fetch;

function forgotRequest(email: string, ip: string): Request {
    return new Request('https://app.test/api/auth/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
            'x-forwarded-proto': 'https',
            origin: 'https://app.hami.legal',
        },
        body: JSON.stringify({ email, redirectTo: 'https://app.hami.legal/?hami_auth=recovery' }),
    });
}

describe('forgot-password email rate limit', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.SUPABASE_URL = 'https://project.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        delete process.env.WIFE_REDIS_REST_URL;
        delete process.env.WIFE_REDIS_REST_TOKEN;
        resetWifeRateLimitStoreForTests();
        globalThis.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        resetWifeRateLimitStoreForTests();
        vi.restoreAllMocks();
    });

    it('keeps a generic 200 after the mailbox budget while skipping extra GoTrue recover calls', async () => {
        const statuses: number[] = [];
        for (let i = 0; i < 6; i++) {
            const res = await POST(forgotRequest('same@gmail.com', `203.0.113.${i}`));
            statuses.push(res.status);
            expect(await res.json()).toMatchObject({ ok: true });
        }
        expect(statuses.every((s) => s === 200)).toBe(true);
        const recoverCalls = vi
            .mocked(globalThis.fetch)
            .mock.calls.filter((call) => String(call[0]).includes('/auth/v1/recover'));
        expect(recoverCalls).toHaveLength(4);
    });
});
