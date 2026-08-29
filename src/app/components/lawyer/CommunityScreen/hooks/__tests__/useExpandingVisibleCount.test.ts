import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useExpandingVisibleCount } from '../useExpandingVisibleCount';

describe('useExpandingVisibleCount', () => {
    it('يعيد التعيين عند تغير مفتاح التصفية ولا يتجاوز المجموع', () => {
        const { result, rerender } = renderHook(
            ({ total, resetKey }: { total: number; resetKey: string }) =>
                useExpandingVisibleCount(total, { initial: 4, step: 4, resetKey }),
            { initialProps: { total: 20, resetKey: 'a' } },
        );
        expect(result.current.visibleCount).toBe(4);
        expect(result.current.hasMore).toBe(true);

        rerender({ total: 20, resetKey: 'b' });
        expect(result.current.visibleCount).toBe(4);

        rerender({ total: 3, resetKey: 'b' });
        expect(result.current.visibleCount).toBe(3);
        expect(result.current.hasMore).toBe(false);
    });

    it('لا يعيد القصّ عند نمو المجموع إن عُطّل إعادة التعيين', () => {
        const { result, rerender } = renderHook(
            ({ total }: { total: number }) =>
                useExpandingVisibleCount(total, {
                    initial: 4,
                    step: 4,
                    resetKey: 'k',
                    resetWhenTotalChanges: false,
                }),
            { initialProps: { total: 20 } },
        );
        expect(result.current.visibleCount).toBe(4);
        rerender({ total: 3 });
        expect(result.current.visibleCount).toBe(4);
        expect(result.current.hasMore).toBe(false);

        act(() => {
            result.current.sentinelRef.current = document.createElement('div');
        });
    });
});
