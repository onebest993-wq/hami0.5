import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeizedPropertyWorkflowPanel } from '../SeizedPropertyWorkflowPanel';

vi.mock('../ExecutionInlineAccordion', () => ({
    ExecutionInlineAccordion: ({ steps }: { steps: Array<{ title: string }> }) => (
        <div data-testid="inline-accordion">{steps.map((step) => step.title).join('|')}</div>
    ),
}));

vi.mock('../PropertySeizureInlineSections', () => ({
    PropertySeizureInlineSections: () => <div data-testid="inline-sections" />,
}));

vi.mock('../ExecutorDecisionFollowupMirror', () => ({
    ExecutorDecisionFollowupMirror: () => <div data-testid="decision-mirror" />,
}));

vi.mock('../utils/propertySeizureWorkflowUtils', () => ({
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

vi.mock('../utils/expertCommitteeUtils', () => ({
    readExpertCommitteeSize: vi.fn(() => 3),
}));

vi.mock('../utils/seizureWorkflowStepBackUtils', () => ({
    isSeizureWorkflowNestedView: vi.fn(() => false),
    seizureWorkflowStepBackLabel: vi.fn(() => 'رجوع'),
    shouldShowSeizureWorkflowStepBack: vi.fn(() => false),
}));

vi.mock('../utils/seizureWorkflowRevertUtils', () => ({
    applyPropertyWorkflowRevert: vi.fn(() => null),
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    appendPendingExecutorSeizureDecision: vi.fn(() => 'decision-1'),
}));

describe('SeizedPropertyWorkflowPanel', () => {
    it('renders accordion for property workflow steps', () => {
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
});
