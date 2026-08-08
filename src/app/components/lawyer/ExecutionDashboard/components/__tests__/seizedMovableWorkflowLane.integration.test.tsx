import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SeizedMovableWorkflowPanel } from '../SeizedMovableWorkflowPanel';
import { writeSeizureWorkflowLaneSession } from '@/app/domain/seizure/seizureWorkflowLaneSession';
import { clearAllSeizureWorkflowOptimisticPendingForTests } from '@/app/domain/seizure/seizureWorkflowOptimisticPendingSession';

const { appendPendingExecutorSeizureDecision } = vi.hoisted(() => ({
    appendPendingExecutorSeizureDecision: vi.fn(() => 'decision-auction-1'),
}));

vi.mock('../MovableSeizureInlineSections', () => ({
    MovableSeizureInlineSections: () => <div data-testid="inline-sections" />,
}));

vi.mock('../ExecutorDecisionFollowupMirror', () => ({
    ExecutorDecisionFollowupMirror: () => <div data-testid="decision-mirror" />,
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    appendPendingExecutorSeizureDecision,
    dispatchDecisionsReload: vi.fn(),
    DECISIONS_RELOAD_EVENT: 'hami-decisions-reload',
    readExecutorDecisionsArray: vi.fn(() => []),
}));

function renderValuedMovablePanel() {
    return render(
        <SeizedMovableWorkflowPanel
            movable={
                {
                    id: 'movable-1',
                    status: 'seized',
                    seizureMarkLetterNumber: 'K-1',
                } as never
            }
            workflowStatus="seized"
            decisionsStorageExecutionId="exec-child"
            executionId="exec-child"
            executionDataId="exec-child"
            decisions={[]}
            movables={[
                {
                    id: 'movable-1',
                    status: 'seized',
                    seizureMarkLetterNumber: 'K-1',
                } as never,
            ]}
            movableInlineSaveCtx={
                {
                    persistMovables: vi.fn(),
                    readMovables: vi.fn(() => [
                        {
                            id: 'movable-1',
                            status: 'valued',
                            seizureMarkLetterNumber: 'K-1',
                            expertReportDateYmd: '2026-08-05',
                            expertEstimatedAmountIqd: 5000000,
                            expertNames: ['خبير'],
                        },
                    ]),
                } as never
            }
            showToast={vi.fn()}
            decisionsReloadEpoch={0}
            appealPerspective="creditor_agent"
        />,
    );
}

describe('SeizedMovableWorkflowPanel lane selection (real accordion)', () => {
    beforeEach(() => {
        writeSeizureWorkflowLaneSession('movable:movable-1', null);
        clearAllSeizureWorkflowOptimisticPendingForTests();
        appendPendingExecutorSeizureDecision.mockClear();
    });

    it('يفتح مسار المزايدة بعد النقر', () => {
        renderValuedMovablePanel();
        fireEvent.click(screen.getByTestId('movable-workflow-lane-auction'));
        expect(screen.getByRole('button', { name: 'طلب تحديد موعد مزايدة' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'مسار الاعتراض على التقدير' })).not.toBeInTheDocument();
    });

    it('يفتح مسار الاعتراض بعد النقر', () => {
        renderValuedMovablePanel();
        fireEvent.click(screen.getByTestId('movable-workflow-lane-objection'));
        expect(screen.getByRole('button', { name: 'اعتراض على التقرير' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'اعتراض على الخبراء' })).toBeInTheDocument();
    });

    it('يحتفظ باختيار المسار بعد إعادة mount للوحة', () => {
        const { unmount } = renderValuedMovablePanel();
        fireEvent.click(screen.getByTestId('movable-workflow-lane-auction'));
        expect(screen.getByRole('button', { name: 'طلب تحديد موعد مزايدة' })).toBeInTheDocument();
        unmount();
        renderValuedMovablePanel();
        expect(screen.getByRole('button', { name: 'طلب تحديد موعد مزايدة' })).toBeInTheDocument();
    });

    it('يعرض قيد البت بعد طلب موعد مزايدة ويحتفظ به بعد remount', () => {
        const { unmount } = renderValuedMovablePanel();
        fireEvent.click(screen.getByTestId('movable-workflow-lane-auction'));
        fireEvent.click(screen.getByRole('button', { name: 'طلب تحديد موعد مزايدة' }));
        expect(appendPendingExecutorSeizureDecision).toHaveBeenCalled();
        expect(screen.getByText(/قيد البت/i)).toBeInTheDocument();
        unmount();
        renderValuedMovablePanel();
        expect(screen.getByText(/قيد البت/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'طلب تحديد موعد مزايدة' })).not.toBeInTheDocument();
    });
});
