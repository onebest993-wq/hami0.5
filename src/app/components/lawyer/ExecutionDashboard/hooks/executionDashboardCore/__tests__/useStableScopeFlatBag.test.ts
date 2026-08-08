import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStableScopeFlatBag } from '../useStableScopeFlatBag';

describe('useStableScopeFlatBag', () => {
    it('keeps reference when picked bag is new object with same values', () => {
        const shared = { id: '1' };
        const first = { flag: true, payload: shared };
        const { result, rerender } = renderHook(
            ({ bag }) => useStableScopeFlatBag(bag),
            { initialProps: { bag: first } },
        );
        const refA = result.current;
        rerender({ bag: { flag: true, payload: shared } });
        expect(result.current).toBe(refA);
    });

    it('updates reference when primitive values change', () => {
        const { result, rerender } = renderHook(
            ({ bag }) => useStableScopeFlatBag(bag),
            { initialProps: { bag: { showExecutionTrashModal: false } } },
        );
        const refA = result.current;
        rerender({ bag: { showExecutionTrashModal: true } });
        expect(result.current).not.toBe(refA);
        expect(result.current.showExecutionTrashModal).toBe(true);
    });

    it('updates reference when draft churn fields change', () => {
        const { result, rerender } = renderHook(
            ({ bag }) => useStableScopeFlatBag(bag),
            { initialProps: { bag: { noteTitle: '' } } },
        );
        const refA = result.current;
        rerender({ bag: { noteTitle: 'مسودة' } });
        expect(result.current).not.toBe(refA);
    });
});
