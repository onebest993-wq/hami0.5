import { afterEach, describe, expect, it, vi } from 'vitest';
import { setWifeNativeFetchForTests } from '@/app/security/wifeNativeFetch';
import { SecureFetchError } from '@/app/services/SecureFetchError';
import {
    clearWifeSignAuthCircuit,
    fetchBffWifeSignedHeaders,
    isWifeSignCircuitOpen,
    resetWifeSignCircuitForTests,
} from '@/app/utils/bffWifeSign';

describe('fetchBffWifeSignedHeaders', () => {
    afterEach(() => {
        setWifeNativeFetchForTests(null);
        resetWifeSignCircuitForTests();
        vi.restoreAllMocks();
    });

    it('uses native fetch and never the patched global fetch', async () => {
        const nativeFetch = vi.fn(async () =>
            new Response(JSON.stringify({ ok: true, headers: { 'X-WIFE-Signature': 'signed' } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        setWifeNativeFetchForTests(nativeFetch);
        const globalFetch = vi.fn();
        vi.stubGlobal('fetch', globalFetch);

        const headers = await fetchBffWifeSignedHeaders({
            method: 'GET',
            url: 'http://localhost/api/forum/posts',
            body: '',
        });

        expect(headers['X-WIFE-Signature']).toBe('signed');
        expect(nativeFetch).toHaveBeenCalledTimes(1);
        expect(globalFetch).not.toHaveBeenCalled();
    });

    it('يمرّر AbortSignal ولا يرسل contentHash الفارغ', async () => {
        const controller = new AbortController();
        const nativeFetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
            const body = String(init?.body ?? '');
            expect(body).not.toContain('contentHash');
            expect(init?.signal).toBe(controller.signal);
            return new Response(JSON.stringify({ ok: true, headers: { 'X-WIFE-Signature': 'signed' } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        });
        setWifeNativeFetchForTests(nativeFetch);

        await fetchBffWifeSignedHeaders({
            method: 'GET',
            url: 'http://localhost/api/admin/consultations',
            body: '',
            signal: controller.signal,
        });

        expect(nativeFetch).toHaveBeenCalledTimes(1);
    });

    it('يفتح دائرة قطع بعد 401 ويمنع عاصفة wife-sign', async () => {
        const nativeFetch = vi.fn(async () =>
            new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        setWifeNativeFetchForTests(nativeFetch);

        await expect(
            fetchBffWifeSignedHeaders({
                method: 'GET',
                url: 'http://localhost/api/forum/posts',
                body: '',
            }),
        ).rejects.toMatchObject({ name: 'SecureFetchError', status: 401 });

        expect(isWifeSignCircuitOpen()).toBe(true);
        expect(nativeFetch).toHaveBeenCalledTimes(1);

        await expect(
            fetchBffWifeSignedHeaders({
                method: 'GET',
                url: 'http://localhost/api/forum/posts',
                body: '',
            }),
        ).rejects.toBeInstanceOf(SecureFetchError);

        expect(nativeFetch).toHaveBeenCalledTimes(1);
    });

    it('clearWifeSignAuthCircuit يعيد التوقيع بعد قطع 401', async () => {
        const nativeFetch = vi.fn(async () =>
            new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        setWifeNativeFetchForTests(nativeFetch);

        await expect(
            fetchBffWifeSignedHeaders({
                method: 'GET',
                url: 'http://localhost/api/forum/posts',
                body: '',
            }),
        ).rejects.toMatchObject({ name: 'SecureFetchError', status: 401 });
        expect(isWifeSignCircuitOpen()).toBe(true);

        clearWifeSignAuthCircuit();
        expect(isWifeSignCircuitOpen()).toBe(false);

        nativeFetch.mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, headers: { 'X-WIFE-Signature': 'signed' } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        await expect(
            fetchBffWifeSignedHeaders({
                method: 'GET',
                url: 'http://localhost/api/forum/posts',
                body: '',
            }),
        ).resolves.toEqual({ 'X-WIFE-Signature': 'signed' });
        expect(nativeFetch).toHaveBeenCalledTimes(2);
    });
});
