import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardEvictionFinancialHandlers } from '../useExecutionDashboardEvictionFinancialHandlers';

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    hasApprovedLawyerFeePayout: vi.fn(() => false),
    appendEvictionExecutorRequest: vi.fn(() => true),
}));

describe('useExecutionDashboardEvictionFinancialHandlers', () => {
    const baseParams = () => ({
        decisionsStorageExecutionId: 'dossier-1',
        parsedLawyerFees: 500000,
        lawyerFeeDisburseMode: 'lump_sum',
        lawyerFeeDisburseNotes: '',
        evictionExpenseAmount: '10000',
        evictionExpenseNote: 'مصاريف',
        evictionExpensePayMode: 'lump_sum',
        evictionCaseExpenses: [],
        timelineEvents: [],
        nextTimelineId: (() => {
            let n = 0;
            return () => `tl-${++n}`;
        })(),
        persistExecutionMerge: vi.fn(),
        showToast: vi.fn(),
        setEvictionAssetsTabUnlocked: vi.fn(),
        setTimelineEvents: vi.fn(),
        setEvictionCaseExpenses: vi.fn(),
        setShowEvictionLawyerFeeModal: vi.fn(),
        setLawyerFeeDisburseNotes: vi.fn(),
        setShowEvictionExpenseModal: vi.fn(),
        setEvictionExpenseAmount: vi.fn(),
        setEvictionExpenseNote: vi.fn(),
        setEvictionExpensePayMode: vi.fn(),
    });

    beforeEach(() => {
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-06-27T12:00:00.000Z');
    });

    it('handleEvictionLawyerFeeRequest opens modal when payout not approved', () => {
        const setShowEvictionLawyerFeeModal = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardEvictionFinancialHandlers({
                ...baseParams(),
                setShowEvictionLawyerFeeModal,
            }),
        );

        act(() => {
            result.current.handleEvictionLawyerFeeRequest();
        });

        expect(setShowEvictionLawyerFeeModal).toHaveBeenCalledWith(true);
    });

    it('handleEvictionLedgerActivated persists timeline unlock', () => {
        const persistExecutionMerge = vi.fn();
        const setTimelineEvents = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardEvictionFinancialHandlers({
                ...baseParams(),
                persistExecutionMerge,
                setTimelineEvents,
                showToast,
            }),
        );

        act(() => {
            result.current.handleEvictionLedgerActivated();
        });

        expect(setTimelineEvents).toHaveBeenCalled();
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({ eviction_assets_tab_unlocked: true }),
        );
        expect(showToast).toHaveBeenCalledWith(
            'تم فتح مسار المطالبة وتسجيله في السجل الزمني.',
            'success',
        );
    });

    it('runEvictionExpenseSubmit rejects invalid amount', async () => {
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardEvictionFinancialHandlers({
                ...baseParams(),
                evictionExpenseAmount: '',
                showToast,
            }),
        );

        await act(async () => {
            await result.current.runEvictionExpenseSubmit();
        });

        expect(showToast).toHaveBeenCalledWith(
            'أدخل مبلغاً صحيحاً',
            'warning',
            expect.any(Object),
        );
    });
});
