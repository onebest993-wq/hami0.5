import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchQuery } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchQuery';
import { TIMING } from '@/app/utils/constants';

describe('useSearchQuery', () => {
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

    it('لا يعتبر بناء الفهرس isSearching — يظهر في اللوحة فقط', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useSearchQuery('', null, true, 0));

        act(() => {
            result.current.setQuery('دعوى');
        });
        act(() => {
            vi.advanceTimersByTime(TIMING.SEARCH_DEBOUNCE + 10);
        });

        expect(result.current.debouncedQuery).toBe('دعوى');
        expect(result.current.isSearching).toBe(false);
        vi.useRealTimers();
    });
});
