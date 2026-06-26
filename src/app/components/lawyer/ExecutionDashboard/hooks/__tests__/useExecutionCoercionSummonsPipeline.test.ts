import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionCoercionSummonsPipeline } from '../useExecutionCoercionSummonsPipeline';

describe('useExecutionCoercionSummonsPipeline', () => {
    it('syncs coercion fields when execution file key changes', () => {
        const { result, rerender } = renderHook(
            ({ key, data }: { key: string; data: Record<string, unknown> | null }) =>
                useExecutionCoercionSummonsPipeline(key, data as never),
            {
                initialProps: {
                    key: 'ex-1',
                    data: {
                        id: 'ex-1',
                        summoningRound: 2,
                        voluntaryAttendanceCount: 1,
                        investigationCourtRequested: true,
                    },
                },
            },
        );

        expect(result.current.summoningRound).toBe(2);
        expect(result.current.voluntaryAttendanceCount).toBe(1);
        expect(result.current.investigationCourtRequested).toBe(true);

        rerender({
            key: 'ex-2',
            data: {
                id: 'ex-2',
                summoningRound: 4,
                voluntaryAttendanceCount: 3,
                investigationCourtRequested: false,
            },
        });

        expect(result.current.summoningRound).toBe(4);
        expect(result.current.voluntaryAttendanceCount).toBe(3);
        expect(result.current.investigationCourtRequested).toBe(false);
    });
});
