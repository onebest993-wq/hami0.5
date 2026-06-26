import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionFollowupController } from '../useExecutionFollowupController';

describe('useExecutionFollowupController', () => {
    it('resets solidary debtor tab when followup modal closes', () => {
        const { result, rerender } = renderHook(
            ({ open }: { open: boolean }) =>
                useExecutionFollowupController({
                    showUnifiedExecutionModal: open,
                    executionData: { id: 'ex-1' } as never,
                    setExecutionModal: () => {},
                }),
            { initialProps: { open: true } },
        );

        act(() => {
            result.current.setFollowupSolidaryDebtorIndex(2);
        });
        expect(result.current.followupSolidaryDebtorIndex).toBe(2);

        rerender({ open: false });
        expect(result.current.followupSolidaryDebtorIndex).toBe(0);
    });

    it('syncs eviction drafts when execution file changes', () => {
        const { result, rerender } = renderHook(
            ({ data }: { data: { id: string; eviction_vacate_deadline?: string } | null }) =>
                useExecutionFollowupController({
                    showUnifiedExecutionModal: false,
                    executionData: data as never,
                    setExecutionModal: () => {},
                }),
            {
                initialProps: {
                    data: { id: 'ex-1', eviction_vacate_deadline: '2026-01-15' },
                },
            },
        );

        expect(result.current.evictionVacateDeadlineLocal).toBe('2026-01-15');
        expect(result.current.evictionVacateDraft).toBe('2026-01-15');

        rerender({ data: { id: 'ex-2', eviction_vacate_deadline: '2026-06-01' } });
        expect(result.current.evictionVacateDeadlineLocal).toBe('2026-06-01');
        expect(result.current.evictionVacateDraft).toBe('2026-06-01');
    });
});
