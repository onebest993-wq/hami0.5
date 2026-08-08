import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    isSameOriginApiBlocked,
    probeSameOriginApi,
    resetSameOriginApiProbeForTests,
} from '../sameOriginApiProbe';

vi.mock('@/app/utils/bffAuthClient', () => ({
    isBffAuthEnabled: vi.fn(() => true),
}));

vi.mock('@/app/services/auth/shellAuth', () => ({
    isShellAuthBypassed: vi.fn(() => false),
}));

describe('sameOriginApiProbe', () => {
    afterEach(() => {
        resetSameOriginApiProbeForTests();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('skips fetch when BFF auth is disabled', async () => {
        const { isBffAuthEnabled } = await import('@/app/utils/bffAuthClient');
        vi.mocked(isBffAuthEnabled).mockReturnValue(false);
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        await probeSameOriginApi();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(isSameOriginApiBlocked()).toBe(true);
    });

    it('skips fetch when shell auth is bypassed (trial)', async () => {
        const { isBffAuthEnabled } = await import('@/app/utils/bffAuthClient');
        const { isShellAuthBypassed } = await import('@/app/services/auth/shellAuth');
        vi.mocked(isBffAuthEnabled).mockReturnValue(true);
        vi.mocked(isShellAuthBypassed).mockReturnValue(true);
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        await probeSameOriginApi();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(isSameOriginApiBlocked()).toBe(true);
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

    it('marks available when JSON API responds', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
            }),
        );

        const result = await probeSameOriginApi();
        expect(result).toBe('available');
        expect(isSameOriginApiBlocked()).toBe(false);
    });
});
