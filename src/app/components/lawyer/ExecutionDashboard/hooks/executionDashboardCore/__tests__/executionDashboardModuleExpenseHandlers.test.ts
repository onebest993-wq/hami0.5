import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardModuleExpenseHandlers } from '../useExecutionDashboardModuleExpenseHandlers';

vi.mock('@/app/utils/specificDeliveryItemsUtils', () => ({
    readSpecificDeliveryItems: vi.fn(() => [{ id: 'item-1' }]),
    markSpecificDeliveryItemDeclaredDestroyed: vi.fn(() => [{ id: 'item-1', destroyed: true }]),
}));

describe('useExecutionDashboardModuleExpenseHandlers', () => {
    const baseParams = () => ({
        executionData: { specificDeliveryItemName: 'سيارة' } as any,
        encroachmentCaseExpenses: [],
        specificDeliveryCaseExpenses: [],
        timelineEvents: [],
        nextTimelineId: (() => {
            let n = 0;
            return () => `tl-${++n}`;
        })(),
        persistExecutionMerge: vi.fn(),
        setEncroachmentCaseExpenses: vi.fn(),
        setSpecificDeliveryCaseExpenses: vi.fn(),
        setTimelineEvents: vi.fn(),
    });

    beforeEach(() => {
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-06-27T12:00:00.000Z');
    });

    it('handleEncroachmentExpenseRecorded persists encroachment expenses', () => {
        const persistExecutionMerge = vi.fn();
        const setTimelineEvents = vi.fn();
        const row = {
            id: 'e1',
            amount: 5000,
            note: 'مصاريف',
            date: '2026-06-27',
            requestTitle: 'طلب',
        };

        const { result } = renderHook(() =>
            useExecutionDashboardModuleExpenseHandlers({
                ...baseParams(),
                persistExecutionMerge,
                setTimelineEvents,
            }),
        );

        act(() => {
            result.current.handleEncroachmentExpenseRecorded(row);
        });

        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                encroachment_case_expenses: [row],
            }),
        );
        expect(setTimelineEvents).toHaveBeenCalled();
    });

    it('handleSpecificDeliveryFinancialized skips non-positive amount', () => {
        const persistExecutionMerge = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardModuleExpenseHandlers({
                ...baseParams(),
                persistExecutionMerge,
            }),
        );

        act(() => {
            result.current.handleSpecificDeliveryFinancialized(0);
        });

        expect(persistExecutionMerge).not.toHaveBeenCalled();
    });

    it('handleSpecificDeliveryItemDeclaredDestroyed merges items patch', async () => {
        const persistExecutionMerge = vi.fn();
        const { markSpecificDeliveryItemDeclaredDestroyed } = await import(
            '@/app/utils/specificDeliveryItemsUtils'
        );

        const { result } = renderHook(() =>
            useExecutionDashboardModuleExpenseHandlers({
                ...baseParams(),
                persistExecutionMerge,
            }),
        );

        act(() => {
            result.current.handleSpecificDeliveryItemDeclaredDestroyed('item-1');
        });

        expect(markSpecificDeliveryItemDeclaredDestroyed).toHaveBeenCalled();
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({ specificDeliveryItems: expect.any(Array) }),
        );
    });
});
