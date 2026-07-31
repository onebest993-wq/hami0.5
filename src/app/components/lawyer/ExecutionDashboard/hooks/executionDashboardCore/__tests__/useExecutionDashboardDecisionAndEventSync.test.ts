import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HAMI_APPEND_EXECUTION_TIMELINE } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import {
    useExecutionDashboardDeceasedDebtorCoerciveReset,
    useExecutionDashboardWindowEventListeners,
} from '../useExecutionDashboardDecisionAndEventSync';
import { buildDeceasedDebtorCoerciveResetPatch } from '../executionDashboardHeirsAndDeceasedSync';

describe('useExecutionDashboardDecisionAndEventSync', () => {
    it('resets stale coercive state when the active debtor is deceased', () => {
        const setActiveCoerciveActions = vi.fn();
        const setDebtorArrested = vi.fn();
        const setInvestigationPathDebtorPresent = vi.fn();
        const persistExecutionMerge = vi.fn();

        renderHook(() =>
            useExecutionDashboardDeceasedDebtorCoerciveReset({
                activeDebtorIsDeceased: true,
                activeCoerciveActions: ['salary', 'travel_ban'],
                debtorArrested: true,
                investigationPathDebtorPresent: true,
                executionData: {
                    forced_bring_in_personal_outcome: { status: 'issued' },
                    forced_bring_in_personal_followup_logged: true,
                } as never,
                setActiveCoerciveActions,
                setDebtorArrested,
                setInvestigationPathDebtorPresent,
                persistExecutionMerge,
            }),
        );

        expect(setActiveCoerciveActions).toHaveBeenCalledWith([]);
        expect(setDebtorArrested).toHaveBeenCalledWith(false);
        expect(setInvestigationPathDebtorPresent).toHaveBeenCalledWith(false);
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            buildDeceasedDebtorCoerciveResetPatch(),
        );
    });

    it('appends execution timeline events through the window bridge for the current execution', () => {
        const pushTimelineEvent = vi.fn();
        const setShowDecisionsModal = vi.fn();
        const setShowHeirsNotificationModal = vi.fn();

        renderHook(() =>
            useExecutionDashboardWindowEventListeners({
                executionData: { id: 'exec-1' } as never,
                executionId: 'exec-1',
                decisionsStorageExecutionId: 'store-1',
                setShowDecisionsModal,
                openExecutionSeizuresTab: vi.fn(),
                pushTimelineEventRef: { current: pushTimelineEvent },
                nextTimelineId: () => 'tl-1',
                showDecisionsModal: true,
                showHeirsNotificationModal: true,
                setShowHeirsNotificationModal,
            }),
        );

        act(() => {
            window.dispatchEvent(
                new CustomEvent(HAMI_APPEND_EXECUTION_TIMELINE, {
                    detail: {
                        executionId: 'exec-1',
                        event: {
                            type: 'other',
                            date: '2026-07-11T10:00:00.000Z',
                            timestamp: '2026-07-11T10:00:00.000Z',
                            title: 'إجراء جديد',
                            description: 'وصف الإجراء',
                            source: 'اختبار',
                        },
                        mergePatch: { timelineEventsTouched: true },
                    },
                }),
            );
        });

        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'tl-1',
                title: 'إجراء جديد',
                source: 'اختبار',
            }),
            { mergePatch: { timelineEventsTouched: true } },
        );
        expect(setShowHeirsNotificationModal).toHaveBeenCalledWith(false);
    });
});
