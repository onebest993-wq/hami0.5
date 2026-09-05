import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BuildGlobalSearchIndexInput } from '@/app/services/globalSearchIndex';
import {
    invalidateGlobalSearchIndexCache,
    resolveGlobalSearchIndex,
} from '@/app/services/globalSearchIndexRuntime';

const buildMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/services/search/globalSearchIndexWorkerClient', () => ({
    buildGlobalSearchIndexOffThread: (...args: unknown[]) => buildMock(...args),
    prefetchGlobalSearchIndexWorker: vi.fn(),
}));

const input: BuildGlobalSearchIndexInput = {
    files: [],
    globalNotes: [],
    cases: [],
    criminalCases: [],
    userId: 'lawyer-a',
    profileLine: '',
};

describe('resolveGlobalSearchIndex', () => {
    afterEach(() => {
        invalidateGlobalSearchIndexCache();
        buildMock.mockReset();
    });

    it('يجمع الطلبات المتزامنة لنفس المفتاح في وعد واحد', async () => {
        let release: (value: unknown) => void = () => undefined;
        buildMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = resolve;
                }),
        );

        const a = resolveGlobalSearchIndex(input, 'interactive');
        const b = resolveGlobalSearchIndex(input, 'interactive');
        expect(buildMock).toHaveBeenCalledTimes(1);

        release([]);
        await expect(a).resolves.toEqual([]);
        await expect(b).resolves.toEqual([]);
        expect(buildMock).toHaveBeenCalledTimes(1);
    });

    it('لا يكتب الكاش بعد الإبطال أثناء البناء', async () => {
        let release: (value: unknown) => void = () => undefined;
        buildMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = resolve;
                }),
        );

        const pending = resolveGlobalSearchIndex(input, 'interactive');
        invalidateGlobalSearchIndexCache();
        release([{ id: 'stale' }]);
        await pending;

        buildMock.mockResolvedValueOnce([]);
        const next = await resolveGlobalSearchIndex(input, 'interactive');
        expect(next).toEqual([]);
        expect(buildMock).toHaveBeenCalledTimes(2);
    });
});
