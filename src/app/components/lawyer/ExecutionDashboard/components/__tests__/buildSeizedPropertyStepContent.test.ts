import { describe, expect, it, vi } from 'vitest';
import { buildSeizedPropertyStepContent } from '../buildSeizedPropertyStepContent';

describe('buildSeizedPropertyStepContent', () => {
    it('returns null for future steps', () => {
        const node = buildSeizedPropertyStepContent(3, {
            activeIdx: 1,
            decisions: [],
            normStatus: 'seized',
            p: { id: 'p1' } as any,
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
            renderApprovedInlineResume: () => null,
            proceedsDone: false,
            openTrustDisburseForProceeds: vi.fn(),
        });
        expect(node).toBeNull();
    });
});
