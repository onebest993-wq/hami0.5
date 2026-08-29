import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    isSameOriginApiBlocked,
    probeSameOriginApi,
    resetSameOriginApiProbeForTests,
} from '../sameOriginApiProbe';

vi.mock('@/app/services/auth/shellAuth', () => ({
    isShellAuthBypassed: vi.fn(() => false),
}));

describe('sameOriginApiProbe', () => {
    afterEach(() => {
        resetSameOriginApiProbeForTests();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('probes healthz even when shell auth is bypassed', async () => {
        const { isShellAuthBypassed } = await import('@/app/services/auth/shellAuth');
        vi.mocked(isShellAuthBypassed).mockReturnValue(true);
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
            }),
        );

        const result = await probeSameOriginApi();
        expect(result).toBe('available');
        expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/public/healthz');
        expect(isSameOriginApiBlocked()).toBe(false);
    });

    it('probes healthz even when BFF cookie mode is off', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
            }),
        );

        const result = await probeSameOriginApi();
        expect(result).toBe('available');
        expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/public/healthz');
        expect((vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit | undefined)?.signal).toBeUndefined();
        expect(isSameOriginApiBlocked()).toBe(false);
    });

    it('marks unavailable when response is HTML (static SPA host)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
            }),
        );

        await probeSameOriginApi();
        expect(isSameOriginApiBlocked()).toBe(true);
    });

    it('retries once when the first probe is aborted', async () => {
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
            .mockResolvedValueOnce({
                ok: true,
                headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
            });
        vi.stubGlobal('fetch', fetchMock);

        const result = await probeSameOriginApi();
        expect(result).toBe('available');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(isSameOriginApiBlocked()).toBe(false);
    });

    it('marks available on JSON even if status is not 2xx', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 503,
                headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
            }),
        );

        const result = await probeSameOriginApi();
        expect(result).toBe('available');
        expect(isSameOriginApiBlocked()).toBe(false);
    });

    it('المسبار لا يستخدم AbortController حتى لا يظهر ERR_ABORTED في الكونسول', () => {
        const src = readFileSync(resolve(process.cwd(), 'src/app/runtime/sameOriginApiProbe.ts'), 'utf8');
        expect(src).not.toContain('AbortController');
        expect(src).not.toMatch(/signal:\s*controller/);
    });
});
