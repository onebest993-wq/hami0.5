import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SeizedMovableWorkflowPanel } from '../SeizedMovableWorkflowPanel';
import { clearAllSeizureWorkflowOptimisticPendingForTests } from '@/app/domain/seizure/seizureWorkflowOptimisticPendingSession';

vi.mock('../ExecutionInlineAccordion', () => ({
    ExecutionInlineAccordion: ({
        steps,
    }: {
        steps: Array<{ content?: React.ReactNode; status: string }>;
    }) => (
        <div data-testid="inline-accordion">
            {steps
                .filter((s) => s.status === 'active')
                .map((s, i) => <div key={i}>{s.content}</div>)}
        </div>
    ),
}));

vi.mock('../MovableSeizureInlineSections', () => ({
    MovableSeizureInlineSections: () => <div data-testid="inline-sections" />,
}));

vi.mock('../ExecutorDecisionFollowupMirror', () => ({
    ExecutorDecisionFollowupMirror: () => <div data-testid="decision-mirror" />,
}));

const appendPendingExecutorSeizureDecision = vi.fn(() => 'decision-expert-1');

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    appendPendingExecutorSeizureDecision: (...args: unknown[]) =>
        appendPendingExecutorSeizureDecision(...args),
    dispatchDecisionsReload: vi.fn(),
    DECISIONS_RELOAD_EVENT: 'hami-decisions-reload',
    readExecutorDecisionsArray: vi.fn(() => []),
}));

describe('SeizedMovableWorkflowPanel', () => {
    beforeEach(() => {
        clearAllSeizureWorkflowOptimisticPendingForTests();
        appendPendingExecutorSeizureDecision.mockClear();
    });

    it('يرسل طلب انتداب خبراء ويعرض مرآة القرار المعلّق', () => {
        const showToast = vi.fn();
        render(
            <SeizedMovableWorkflowPanel
                movable={
                    {
                        id: 'movable-1',
                        status: 'seized',
                        seizureMarkLetterNumber: '123',
                        seizureMarkDateYmd: '2026-08-01',
                    } as never
                }
                workflowStatus="seized"
                decisionsStorageExecutionId=""
                executionId="exec-child"
                executionDataId="exec-child"
                decisions={[]}
                movables={[
                    {
                        id: 'movable-1',
                        status: 'seized',
                        seizureMarkLetterNumber: '123',
                        seizureMarkDateYmd: '2026-08-01',
                    } as never,
                ]}
                movableInlineSaveCtx={{ persistMovables: vi.fn(), readMovables: vi.fn(() => []) } as never}
                showToast={showToast}
                decisionsReloadEpoch={0}
                appealPerspective="creditor_agent"
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'طلب انتداب خبراء للتقدير' }));

        expect(appendPendingExecutorSeizureDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'exec-child',
                seizureSubtype: 'movable_expert',
            }),
        );
        expect(showToast).toHaveBeenCalledWith(
            'تم إرسال الطلب — قرار المنفذ يظهر أدناه.',
            'success',
        );
        expect(screen.getByTestId('decision-mirror')).toBeInTheDocument();
    });

    it('يعرض خطوة انتداب الخبراء عندما يُحدَّث كتاب التأييد في readMovables دون انتظار إعادة mount للأب', () => {
        render(
            <SeizedMovableWorkflowPanel
                movable={
                    {
                        id: 'movable-1',
                        status: 'seized',
                    } as never
                }
                workflowStatus="seized"
                decisionsStorageExecutionId=""
                executionId="exec-child"
                executionDataId="exec-child"
                decisions={[]}
                movables={[
                    {
                        id: 'movable-1',
                        status: 'seized',
                    } as never,
                ]}
                movableInlineSaveCtx={
                    {
                        persistMovables: vi.fn(),
                        readMovables: vi.fn(() => [
                            {
                                id: 'movable-1',
                                status: 'seized',
                                seizureMarkLetterNumber: 'K-99',
                            },
                        ]),
                    } as never
                }
                showToast={vi.fn()}
                decisionsReloadEpoch={0}
                appealPerspective="creditor_agent"
            />,
        );

        expect(
            screen.getByRole('button', { name: 'طلب انتداب خبراء للتقدير' }),
        ).toBeInTheDocument();
    });

    it('يعرض خطوة موعد المزايدة عندما يُحدَّث التقدير في readMovables دون انتظار إعادة mount للأب', () => {
        render(
            <SeizedMovableWorkflowPanel
                movable={
                    {
                        id: 'movable-1',
                        status: 'seized',
                        seizureMarkLetterNumber: 'K-1',
                    } as never
                }
                workflowStatus="seized"
                decisionsStorageExecutionId=""
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

        expect(screen.getByRole('button', { name: 'مسار المزايدة' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'مسار الاعتراض على التقدير' })).toBeInTheDocument();
    });

    it('يعرض بطاقة قيد البت بعد إرسال طلب الاعتراض (تفاؤلي)', () => {
        render(
            <SeizedMovableWorkflowPanel
                movable={
                    {
                        id: 'movable-1',
                        status: 'valued',
                        seizureMarkLetterNumber: 'K-1',
                        expertReportDateYmd: '2026-08-05',
                        expertEstimatedAmountIqd: 5000000,
                    } as never
                }
                workflowStatus="valued"
                decisionsStorageExecutionId=""
                executionId="exec-child"
                executionDataId="exec-child"
                decisions={[]}
                movables={[
                    {
                        id: 'movable-1',
                        status: 'valued',
                        seizureMarkLetterNumber: 'K-1',
                    } as never,
                ]}
                movableInlineSaveCtx={{ persistMovables: vi.fn(), readMovables: vi.fn(() => []) } as never}
                showToast={vi.fn()}
                decisionsReloadEpoch={0}
                appealPerspective="creditor_agent"
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'مسار الاعتراض على التقدير' }));
        fireEvent.click(screen.getByRole('button', { name: 'اعتراض على التقرير' }));

        expect(appendPendingExecutorSeizureDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'exec-child',
                seizureSubtype: 'movable_expert_objection',
            }),
        );
        expect(screen.getByTestId('decision-mirror')).toBeInTheDocument();
    });
});
