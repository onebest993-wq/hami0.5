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

    it('يثبّت هوية الكائن عندما لا تتغير القيم القابلة للمقارنة', () => {
        const { result, rerender } = renderHook(
            ({ token }: { token: number }) =>
                useExecutionFollowupModalSnapshot(true, () => ({
                    unifiedModalTab: 'seizure_requests',
                    token,
                })),
            { initialProps: { token: 1 } },
        );
        const first = result.current;
        rerender({ token: 1 });
        expect(result.current).toBe(first);

        rerender({ token: 2 });
        expect(result.current).not.toBe(first);
        expect(result.current).toEqual({
            unifiedModalTab: 'seizure_requests',
            token: 2,
        });
    });
});
