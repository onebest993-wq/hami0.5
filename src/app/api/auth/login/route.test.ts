import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route.ts';
import { resetWifeRateLimitStoreForTests } from '../../security/wifeRateLimitStore.ts';

const originalFetch = globalThis.fetch;

function loginRequest(email: string, ip: string): Request {
    return new Request('https://app.test/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
            'x-forwarded-proto': 'https',
        },
        body: JSON.stringify({ email, password: 'wrong-password' }),
    });
}

/** ترفض Supabase الاعتماد دائماً حتى يقيس الاختبار الحدّ لا نتيجة المصادقة. */
function stubRejectingSupabase(): void {
    globalThis.fetch = vi.fn(
        async () =>
            new Response(JSON.stringify({ error_description: 'Invalid login credentials' }), { status: 400 }),
    ) as unknown as typeof fetch;
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
        stubRejectingSupabase();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        resetWifeRateLimitStoreForTests();
        vi.restoreAllMocks();
    });

    it('stops password spraying against a single account', async () => {
        // البريد نفسه من عناوين مختلفة — الحدّ حسب البريد هو ما يجب أن يمسك هذا.
        const statuses: number[] = [];
        for (let i = 0; i < 12; i++) {
            statuses.push((await POST(loginRequest('victim@example.com', `203.0.113.${i}`))).status);
        }

        expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
        expect(statuses.slice(10)).toEqual([429, 429]);
    });

    it('stops credential stuffing from a single source', async () => {
        // عناوين بريد مختلفة من عنوان واحد — الحدّ حسب العنوان هو ما يجب أن يمسك هذا.
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
        // بلا Redis في الإنتاج كان المخزن يرفض كل شيء؛ تسجيل الدخول يجب أن يبقى متاحاً.
        process.env.NODE_ENV = 'production';

        const first = await POST(loginRequest('prod@example.com', '198.51.100.30'));
        expect(first.status).toBe(401);

        const statuses = await statusesFor(11, 'prod@example.com', '198.51.100.30');
        expect(statuses).toContain(429);
    });
});
