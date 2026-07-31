import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePostEntryHeavyComputeReady } from '../usePostEntryHeavyComputeReady';

describe('usePostEntryHeavyComputeReady', () => {
    it('starts false when enabled so mount-path compute can wait for first paint', () => {
        const { result } = renderHook(() => usePostEntryHeavyComputeReady(true));
        expect(result.current).toBe(false);
    });

    it('is immediately ready when disabled', () => {
        const { result } = renderHook(() => usePostEntryHeavyComputeReady(false));
        expect(result.current).toBe(true);
    });
});
