import { describe, expect, it, vi, beforeEach } from 'vitest';
import type Fuse from 'fuse.js';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { runSearchIndexBuild } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/searchIndexBuildExecutor';
import * as globalSearchFuse from '@/app/services/globalSearchFuse';

const preparedInput = {
    files: [],
    executionFiles: [],
    globalNotes: [],
    cases: [],
    criminalCases: [],
    profileLine: '',
    userId: null,
    notifications: [],
    cacheGeneration: 0,
} as never;

function makeFuse(label: string): Fuse<GlobalSearchEntry> {
    return { label, search: vi.fn() } as unknown as Fuse<GlobalSearchEntry>;
}

const baseSnapshot = {
    overlayOpen: true,
    cacheKey: 'index-key',
    extrasReady: false,
    isLoadingExtras: false,
    activeKey: null as string | null,
    hasFuseInState: false,
};

describe('runSearchIndexBuild', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(globalSearchFuse, 'getCachedGlobalSearchFuse').mockReturnValue(null);
    });

    it('يطبّق الفهرس من الكاش', async () => {
        const cached = makeFuse('cached');
        vi.spyOn(globalSearchFuse, 'getCachedGlobalSearchFuse').mockReturnValue(cached);

        const applyFuse = vi.fn();
        const setBuilding = vi.fn();

        await runSearchIndexBuild(
            { ...baseSnapshot, activeKey: 'other-key' },
            preparedInput,
            'interactive',
            {
                applyFuse,
                clearFuse: vi.fn(),
                setBuilding,
                isCancelled: () => false,
                resolveFuse: vi.fn(),
            },
        );

        expect(applyFuse).toHaveBeenCalledWith(cached, 'index-key');
        expect(setBuilding).toHaveBeenLastCalledWith(false);
    });

    it('لا يبني عند الإغلاق بلا ذاكرة مؤقتة', async () => {
        const resolveFuse = vi.fn();

        await runSearchIndexBuild(
            { ...baseSnapshot, overlayOpen: false },
            preparedInput,
            'idle',
            {
                applyFuse: vi.fn(),
                clearFuse: vi.fn(),
                setBuilding: vi.fn(),
                isCancelled: () => false,
                resolveFuse,
            },
        );

        expect(resolveFuse).not.toHaveBeenCalled();
    });

    it('يبني فهرساً واحداً عند الفتح', async () => {
        const built = makeFuse('built');
        const resolveFuse = vi.fn().mockResolvedValue(built);
        const applyFuse = vi.fn();
        const setBuilding = vi.fn();

        await runSearchIndexBuild(
            baseSnapshot,
            preparedInput,
            'interactive',
            {
                applyFuse,
                clearFuse: vi.fn(),
                setBuilding,
                isCancelled: () => false,
                resolveFuse,
            },
        );

        expect(resolveFuse).toHaveBeenCalledTimes(1);
        expect(resolveFuse).toHaveBeenCalledWith('index-key', preparedInput, 'interactive');
        expect(applyFuse).toHaveBeenCalledWith(built, 'index-key');
        expect(setBuilding).toHaveBeenLastCalledWith(false);
    });

    it('يتوقف عند الإلغاء', async () => {
        let cancelled = false;
        const resolveFuse = vi.fn().mockImplementation(async () => {
            cancelled = true;
            return makeFuse('built');
        });
        const applyFuse = vi.fn();

        await runSearchIndexBuild(
            baseSnapshot,
            preparedInput,
            'interactive',
            {
                applyFuse,
                clearFuse: vi.fn(),
                setBuilding: vi.fn(),
                isCancelled: () => cancelled,
                resolveFuse,
            },
        );

        expect(applyFuse).not.toHaveBeenCalled();
    });
});
