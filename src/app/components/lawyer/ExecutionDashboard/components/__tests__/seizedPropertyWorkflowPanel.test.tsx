import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeizedPropertyWorkflowPanel } from '../SeizedPropertyWorkflowPanel';

const appendPendingExecutorSeizureDecision = vi.hoisted(() =>
    vi.fn(() => 'decision-expert-property-1'),
);

vi.mock('../ExecutionInlineAccordion', () => ({
    ExecutionInlineAccordion: ({
        steps,
    }: {
        steps: Array<{ content?: React.ReactNode; status: string; title: string }>;
    }) => (
        <div data-testid="inline-accordion">
            {steps.map((step) => (
                <div key={step.title} data-status={step.status}>{step.title}</div>
            ))}
            {steps
                .filter((s) => s.status === 'active')
                .map((s, i) => <div key={i}>{s.content}</div>)}
        </div>
    ),
}));

vi.mock('../PropertySeizureInlineSections', () => ({
    PropertySeizureInlineSections: () => <div data-testid="inline-sections" />,
}));

vi.mock('../ExecutorDecisionFollowupMirror', () => ({
    ExecutorDecisionFollowupMirror: () => <div data-testid="decision-mirror" />,
}));

vi.mock('../../utils/propertySeizureWorkflowUtils', () => ({
    buildPropertyWorkflowStepHistory: vi.fn(() => []),
    executorSubtypesForPropertyWorkflowStep: vi.fn(() => []),
    findApprovedUnsavedPropertyDecision: vi.fn(() => null),
    findConflictingPendingPropertySubtype: vi.fn(() => null),
    findSeizureDecisionForProperty: vi.fn(() => null),
    filterRelevantPendingPropertyDecisions: vi.fn(() => []),
    normalizePropertySeizureStatus: vi.fn((status: string) => status),
    propertyConflictingSubtypeLabelAr: vi.fn(() => ''),
    propertySeizureRequestBody: vi.fn(() => 'body'),
    propertyWorkflowActiveStepIndex: vi.fn(() => 0),
    stepStatusForIndex: vi.fn((idx: number, activeIdx: number) =>
        idx < activeIdx ? 'done' : idx === activeIdx ? 'active' : 'upcoming',
    ),
    withdrawPendingPropertyDecisionsForStep: vi.fn(() => 0),
}));

vi.mock('../../utils/expertCommitteeUtils', () => ({
    readExpertCommitteeSize: vi.fn(() => 3),
}));

vi.mock('../../utils/seizureWorkflowStepBackUtils', () => ({
    isSeizureWorkflowNestedView: vi.fn(() => false),
    seizureWorkflowStepBackLabel: vi.fn(() => 'رجوع'),
    shouldShowSeizureWorkflowStepBack: vi.fn(() => false),
}));

vi.mock('../../utils/seizureWorkflowRevertUtils', () => ({
    applyPropertyWorkflowRevert: vi.fn(() => null),
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/utils/executorSeizureDecisionQueue')>();
    return {
        ...actual,
        appendPendingExecutorSeizureDecision: (...args: unknown[]) =>
            appendPendingExecutorSeizureDecision(...args),
    };
});

import * as propertyWorkflowUtils from '../../utils/propertySeizureWorkflowUtils';

describe('SeizedPropertyWorkflowPanel', () => {
    it('renders accordion for property workflow steps', () => {
        vi.mocked(propertyWorkflowUtils.propertyWorkflowActiveStepIndex).mockReturnValue(0);

        render(
            <SeizedPropertyWorkflowPanel
                property={{ id: 'property-1', status: 'seized' } as never}
                workflowStatus="seized"
                decisionsStorageExecutionId="exec-1"
                executionId="exec-1"
                executionDataId="exec-1"
                decisions={[]}
                properties={[{ id: 'property-1', status: 'seized' } as never]}
                propertyInlineSaveCtx={{ persistProperties: vi.fn() } as never}
                showToast={vi.fn()}
                onOpenAppeals={vi.fn()}
                decisionsReloadEpoch={0}
                appealPerspective="creditor_agent"
            />,
        );

        expect(screen.getByText('إجراءات حجز العقار')).toBeInTheDocument();
        expect(screen.getByTestId('inline-accordion')).toBeInTheDocument();
        expect(screen.getByTestId('inline-accordion')).toHaveTextContent('تأييد وضع الإشارة');
    });

    it('يرسل طلب انتداب خبراء ويعرض مرآة القرار المعلّق', () => {
        vi.mocked(propertyWorkflowUtils.propertyWorkflowActiveStepIndex).mockReturnValue(1);
        const showToast = vi.fn();

        render(
            <SeizedPropertyWorkflowPanel
                property={
                    {
                        id: 'property-1',
                        status: 'seized',
                        seizureMarkLetterNumber: '456',
                        seizureMarkDateYmd: '2026-08-01',
                    } as never
                }
                workflowStatus="seized"
                decisionsStorageExecutionId="exec-child"
                executionId="exec-child"
                executionDataId="exec-child"
                decisions={[]}
                properties={[
                    {
                        id: 'property-1',
                        status: 'seized',
                        seizureMarkLetterNumber: '456',
                        seizureMarkDateYmd: '2026-08-01',
                    } as never,
                ]}
                propertyInlineSaveCtx={{ persistProperties: vi.fn() } as never}
                showToast={showToast}
                onOpenAppeals={vi.fn()}
                decisionsReloadEpoch={0}
                appealPerspective="creditor_agent"
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'طلب انتداب خبراء للتقدير' }));

        expect(appendPendingExecutorSeizureDecision).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'exec-child',
                seizureSubtype: 'property_expert',
            }),
        );
        expect(showToast).toHaveBeenCalledWith(
            'تم إرسال الطلب — قرار المنفذ يظهر أدناه.',
            'success',
        );
        expect(screen.getByTestId('decision-mirror')).toBeInTheDocument();
    });
});
