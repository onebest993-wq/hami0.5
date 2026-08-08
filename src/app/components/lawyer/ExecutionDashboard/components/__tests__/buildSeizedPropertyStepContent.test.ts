import { describe, expect, it, vi } from 'vitest';
import { buildPropertyWorkflowStepContent } from '../seizedPropertyWorkflow/buildPropertyWorkflowStepContent';

describe('buildPropertyWorkflowStepContent', () => {
    it('returns null for future steps', () => {
        const node = buildPropertyWorkflowStepContent(
            {
                activeIdx: 1,
                decisions: [],
                normStatus: 'seized',
                p: { id: 'p1' } as never,
                propertyId: 'p1',
                renderInlineForStep: () => null,
                hasPendingSubtype: () => false,
                submitSubtype: () => null,
                hasAnyPendingForStep: () => false,
                expertApprovedUnsaved: null,
                expertCommitteeApprovedUnsaved: null,
                auctionApprovedUnsaved: null,
                reauctionApprovedUnsaved: null,
                step2Lane: null,
                setStep2Lane: vi.fn(),
                optimisticObjectionDecisionId: null,
                submitObjectionRequest: vi.fn(),
                renderStepPendingMirror: () => null,
                dismissedApprovedInlineForStep: null,
                setDismissedApprovedInlineForStep: vi.fn(),
                proceedsDone: false,
                openTrustDisburseForProceeds: vi.fn(),
            },
            3,
        );
        expect(node).toBeNull();
    });
});
