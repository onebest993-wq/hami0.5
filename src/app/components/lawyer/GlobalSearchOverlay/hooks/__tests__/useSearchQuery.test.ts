import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchQuery } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchQuery';
import { GLOBAL_SEARCH_QUERY_DEBOUNCE_MS } from '@/app/components/lawyer/GlobalSearchOverlay/constants';
import {
    resetGlobalSearchDraftQueryForTests,
    writeGlobalSearchDraftQuery,
} from '@/app/runtime/globalSearchDraftQuery';

describe('useSearchQuery', () => {
    beforeEach(() => {
        resetGlobalSearchDraftQueryForTests();
    });

    it('resets query when a new search session starts', () => {
        const { result, rerender } = renderHook(
            ({ session, seed }: { session: number; seed: string }) =>
                useSearchQuery(seed, null, false, session),
            { initialProps: { session: 1, seed: '' } },
        );

        act(() => {
            result.current.setQuery('دعوى تجريبية');
        });
        expect(result.current.query).toBe('دعوى تجريبية');

        rerender({ session: 2, seed: '' });
        expect(result.current.query).toBe('');
    });

    it('applies initial seed on session open', () => {
        const { result, rerender } = renderHook(
            ({ session, seed }: { session: number; seed: string }) =>
                useSearchQuery(seed, null, false, session),
            { initialProps: { session: 0, seed: '' } },
        );

        rerender({ session: 1, seed: 'جلسة' });
        expect(result.current.query).toBe('جلسة');
    });

    it('يعتمد مسودة InstantShell عند غياب seed', () => {
        writeGlobalSearchDraftQuery('من القشرة');
        const { result } = renderHook(() => useSearchQuery('', null, false, 3));
        expect(result.current.query).toBe('من القشرة');
    });

    it('لا يعتبر بناء الفهرس isSearching — يظهر في اللوحة فقط', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useSearchQuery('', null, true, 0));

        act(() => {
            result.current.setQuery('دعوى');
        });
        act(() => {
            vi.advanceTimersByTime(GLOBAL_SEARCH_QUERY_DEBOUNCE_MS + 10);
        });

        expect(result.current.debouncedQuery).toBe('دعوى');
        expect(result.current.isSearching).toBe(false);
        vi.useRealTimers();
    });
});
