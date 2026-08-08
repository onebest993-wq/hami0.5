import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { buildFollowupDerivedState } from '@/app/application/execution/followup/buildFollowupDerivedState';

vi.mock('@/app/application/execution/followup/buildFollowupDerivedState', () => ({
    buildFollowupDerivedState: vi.fn(() => ({
        anyExecutorDecisionResolvedForMemoBadge: false,
        primaryDebtorTaklifActive: false,
        resolvedEmployeeSummonsAssignment: null,
        showEmployeeAssignmentCoerciveBlock: false,
    })),
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    readExecutorDecisionsArray: vi.fn(() => []),
}));

import { useSubsequentNoticeFlow } from '../useSubsequentNoticeFlow';

function baseArgs(): Parameters<typeof useSubsequentNoticeFlow> {
    return [
        { id: 'ex-1' } as never,
        'ex-1',
        0,
        'standard',
        'standard',
        false,
        false,
        false,
        false,
        false,
        false,
        0,
        false,
        0,
        false,
        false,
        false,
        false,
        null,
        false,
        false,
        false,
        false,
        false,
        [],
        [],
        false,
        false,
        false,
        false,
        {},
        null,
        false,
        false,
        false,
        null,
        {},
        null,
        false,
        null,
        false,
    ];
}

describe('useSubsequentNoticeFlow derived wiring', () => {
    it('delegates employee/memo derived state to buildFollowupDerivedState', () => {
        renderHook(() => useSubsequentNoticeFlow(...baseArgs()));

        expect(buildFollowupDerivedState).toHaveBeenCalledWith(
            expect.objectContaining({
                executionData: expect.objectContaining({ id: 'ex-1' }),
                primaryDebtorKeyResolved: null,
                unifiedSummonsTargetDebtorKey: null,
                executorDecisionRows: [],
            }),
        );
    });
});
