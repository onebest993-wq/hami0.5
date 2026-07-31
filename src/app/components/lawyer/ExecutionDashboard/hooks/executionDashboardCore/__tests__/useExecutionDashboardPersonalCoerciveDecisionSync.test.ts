import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { Dispatch, SetStateAction } from 'react';
import { useExecutionDashboardPersonalCoerciveDecisionSync } from '../useExecutionDashboardPersonalCoerciveDecisionSync';

const readExecutorDecisionsArrayMock = vi.fn();

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    readExecutorDecisionsArray: (...args: unknown[]) => readExecutorDecisionsArrayMock(...args),
}));

describe('useExecutionDashboardPersonalCoerciveDecisionSync', () => {
    afterEach(() => {
        readExecutorDecisionsArrayMock.mockReset();
    });

    it('activates travel ban when approved decision exists', () => {
        const persistExecutionMerge = vi.fn();
        readExecutorDecisionsArrayMock.mockReturnValue([
            {
                requestKind: 'personal_coercive',
                personalCoerciveSubtype: 'travel_ban',
                executorOutcome: 'approved',
            },
        ]);

        renderHook(() =>
            useExecutionDashboardPersonalCoerciveDecisionSync({
                executionData: { id: 'exec-1', debtor_travel_ban_active: false } as ExecutionFile,
                executionId: 'exec-1',
                decisionsReloadEpoch: 1,
                persistExecutionMerge,
                setTimelineEvents: vi.fn(),
                nextTimelineId: vi.fn(() => 'tl-1'),
            }),
        );

        expect(persistExecutionMerge).toHaveBeenCalledWith({ debtor_travel_ban_active: true });
    });

    it('logs forced bring followup only once when decision approved and memo missing', () => {
        const persistExecutionMerge = vi.fn();
        const setTimelineEvents = vi.fn(
            (updater: SetStateAction<TimelineEvent[]>) =>
                typeof updater === 'function' ? updater([]) : updater,
        ) as Dispatch<SetStateAction<TimelineEvent[]>>;
        readExecutorDecisionsArrayMock.mockReturnValue([
            {
                requestKind: 'personal_coercive',
                personalCoerciveSubtype: 'forced_bring_in',
                executorOutcome: 'approved',
            },
        ]);

        renderHook(() =>
            useExecutionDashboardPersonalCoerciveDecisionSync({
                executionData: {
                    id: 'exec-1',
                    forced_bring_in_personal_followup_logged: false,
                } as ExecutionFile,
                executionId: 'exec-1',
                decisionsReloadEpoch: 1,
                persistExecutionMerge,
                setTimelineEvents,
                nextTimelineId: (() => {
                    let n = 0;
                    return () => `tl-${++n}`;
                })(),
            }),
        );

        expect(setTimelineEvents).toHaveBeenCalledTimes(1);
    });
});
