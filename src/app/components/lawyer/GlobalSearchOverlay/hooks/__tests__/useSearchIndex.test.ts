import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSearchIndex } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchIndex';
import * as globalSearchFuse from '@/app/services/globalSearchFuse';

vi.mock('@/app/stores/caseStore', () => ({
    useCaseStore: (selector: (s: { cases: [] }) => unknown) => selector({ cases: [] }),
}));

vi.mock('@/app/services/globalSearchIndexPrepare', () => ({
    computeGlobalSearchIndexKey: () => 'key-core',
    prepareGlobalSearchIndexInput: () => ({
        files: [],
        executionFiles: [],
        globalNotes: [],
        cases: [],
        criminalCases: [],
        profileLine: '',
        userId: null,
        notifications: [],
        cacheGeneration: 0,
    }),
}));

vi.mock('@/app/services/globalSearchIndexRuntime', () => ({
    getCachedGlobalSearchIndex: () => null,
    resolveGlobalSearchIndex: vi.fn(),
}));

const baseOptions = {
    files: [],
    globalNotes: [],
    criminalCases: [],
    userId: null,
    profileLine: '',
    extras: null,
    isLoadingExtras: false,
    indexVersion: 0,
};

describe('useSearchIndex', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(globalSearchFuse, 'getCachedGlobalSearchFuse').mockReturnValue(null);
        vi.spyOn(globalSearchFuse, 'hasCachedGlobalSearchFuse').mockReturnValue(false);
    });

    it('does not build fuse while overlay is closed and cache is empty', () => {
        const getOrCreate = vi.spyOn(globalSearchFuse, 'getOrCreateGlobalSearchFuse');

        renderHook(() =>
            useSearchIndex({
                ...baseOptions,
                overlayOpen: false,
            }),
        );

        expect(getOrCreate).not.toHaveBeenCalled();
    });

    it('uses cached fuse when overlay is closed', () => {
        const cached = { search: vi.fn() } as unknown as import('fuse.js').default<
            import('@/app/services/globalSearchIndex').GlobalSearchEntry
        >;
        vi.spyOn(globalSearchFuse, 'getCachedGlobalSearchFuse').mockReturnValue(cached);

        const { result } = renderHook(() =>
            useSearchIndex({
                ...baseOptions,
                overlayOpen: false,
            }),
        );

        expect(result.current.fuse).toBe(cached);
        expect(result.current.isBuildingIndex).toBe(false);
    });
});
