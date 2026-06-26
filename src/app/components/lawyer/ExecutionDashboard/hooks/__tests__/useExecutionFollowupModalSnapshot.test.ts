import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionFollowupModalSnapshot } from '../useExecutionFollowupModalSnapshot';

describe('useExecutionFollowupModalSnapshot', () => {
    it('returns empty snapshot when modal is closed', () => {
        const { result } = renderHook(() =>
            useExecutionFollowupModalSnapshot(false, () => ({ marker: 'live' })),
        );
        expect(result.current).toEqual({});
    });

    it('builds snapshot when modal is open', () => {
        const { result } = renderHook(() =>
            useExecutionFollowupModalSnapshot(true, () => ({ marker: 'live' })),
        );
        expect(result.current).toEqual({ marker: 'live' });
    });
});
