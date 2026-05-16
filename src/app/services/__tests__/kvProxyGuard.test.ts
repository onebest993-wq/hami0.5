/**
 * Regression: حارس kv-proxy يمنع عاصفة الطلبات
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchKvProxyGuarded, resetKvProxyGuardForTests } from '../kvProxyGuard';

const KV_URL = 'https://example.supabase.co/functions/v1/make-server/kv-proxy';

describe('kvProxyGuard', () => {
    beforeEach(() => {
        resetKvProxyGuardForTests();
    });

    it('deduplicates identical in-flight requests', async () => {
        let resolveNative!: (v: Response) => void;
        const native = vi.fn(
            () =>
                new Promise<Response>((resolve) => {
                    resolveNative = resolve;
                }),
        );

        const init = { method: 'POST', body: '{"action":"get","key":"x"}' };
        const p1 = fetchKvProxyGuarded(KV_URL, init, native);
        const p2 = fetchKvProxyGuarded(KV_URL, init, native);

        expect(native).toHaveBeenCalledTimes(1);

        resolveNative(new Response('{"ok":true}', { status: 200 }));
        const [r1, r2] = await Promise.all([p1, p2]);
        expect(r1.status).toBe(200);
        expect(r2.status).toBe(200);
    });

    it('returns 429 when window limit exceeded (dev: 6)', async () => {
        const native = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

        for (let i = 0; i < 6; i++) {
            const res = await fetchKvProxyGuarded(
                KV_URL,
                { method: 'POST', body: `{"i":${i}}` },
                native,
            );
            expect(res.status).toBe(200);
        }

        const blocked = await fetchKvProxyGuarded(
            KV_URL,
            { method: 'POST', body: '{"blocked":true}' },
            native,
        );
        expect(blocked.status).toBe(429);
        expect(native).toHaveBeenCalledTimes(6);
    });
});
