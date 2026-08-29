import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route.ts';
import { resetWifeRateLimitStoreForTests } from '../../security/wifeRateLimitStore.ts';

const originalFetch = globalThis.fetch;

function resendRequest(email: string, ip: string): Request {
    return new Request('https://app.test/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
            'x-forwarded-proto': 'https',
            origin: 'https://app.hami.legal',
        },
        body: JSON.stringify({ email, redirectTo: 'https://app.hami.legal/' }),
    });
}

describe('resend-confirmation', () => {
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

    it('returns a generic 200 and calls GoTrue resend for a trusted mailbox', async () => {
        const res = await POST(resendRequest('ok@gmail.com', '203.0.113.10'));
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({ ok: true });
        const resendCalls = vi
            .mocked(globalThis.fetch)
            .mock.calls.filter((call) => String(call[0]).includes('/auth/v1/resend'));
        expect(resendCalls).toHaveLength(1);
        expect(JSON.parse(String(resendCalls[0]?.[1]?.body ?? '{}'))).toMatchObject({
            type: 'signup',
            email: 'ok@gmail.com',
        });
    });

    it('returns generic 200 for disposable mail without contacting GoTrue', async () => {
        const res = await POST(resendRequest('skip@mailinator.com', '203.0.113.11'));
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({ ok: true });
        expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
    });

    it('rejects an empty email', async () => {
        const res = await POST(resendRequest('', '203.0.113.12'));
        expect(res.status).toBe(400);
        expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
    });

    it('keeps a generic 200 after the mailbox budget while skipping extra GoTrue resend calls', async () => {
        const statuses: number[] = [];
        for (let i = 0; i < 6; i++) {
            const res = await POST(resendRequest('same@gmail.com', `203.0.113.${20 + i}`));
            statuses.push(res.status);
            expect(await res.json()).toMatchObject({ ok: true });
        }
        expect(statuses.every((s) => s === 200)).toBe(true);
        const resendCalls = vi
            .mocked(globalThis.fetch)
            .mock.calls.filter((call) => String(call[0]).includes('/auth/v1/resend'));
        expect(resendCalls).toHaveLength(3);
    });

    it('throttles a single IP after the window budget', async () => {
        const statuses: number[] = [];
        for (let i = 0; i < 9; i++) {
            statuses.push((await POST(resendRequest(`user${i}@gmail.com`, '198.51.100.77'))).status);
        }
        expect(statuses.slice(0, 8).every((s) => s === 200)).toBe(true);
        expect(statuses[8]).toBe(429);
    });
});
