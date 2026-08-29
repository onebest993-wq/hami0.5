import type React from 'react';
import type { SeizedProperty } from '@/app/types/execution';
import type { PropertyInlineSectionKey } from '../PropertySeizureInlineSections';
import type { PropertyWorkflowStep2Lane } from './seizedPropertyWorkflowTypes';

export type PropertyWorkflowStepContentDeps = {
    activeIdx: number;
    decisions: Array<Record<string, unknown>>;
    normStatus: string;
    p: SeizedProperty;
    propertyId: string;
    renderInlineForStep: (stepIndex: number, sectionOverride?: PropertyInlineSectionKey) => React.ReactNode;
    hasPendingSubtype: (subtype: string) => boolean;
    submitSubtype: (
        lead: string,
        requestTitle: string,
        subtype: string,
        extraLines?: string[],
        payloadExtra?: Record<string, unknown>,
    ) => string | null;
    hasAnyPendingForStep: (stepIndex: number) => boolean;
    expertApprovedUnsaved: Record<string, unknown> | null | undefined;
    expertCommitteeApprovedUnsaved: Record<string, unknown> | null | undefined;
    auctionApprovedUnsaved: Record<string, unknown> | null | undefined;
    reauctionApprovedUnsaved: Record<string, unknown> | null | undefined;
    step2Lane: PropertyWorkflowStep2Lane | null;
    setStep2Lane: React.Dispatch<React.SetStateAction<PropertyWorkflowStep2Lane | null>>;
    optimisticObjectionDecisionId: string | null;
    submitObjectionRequest: (objectionKind: 'report' | 'experts') => void;
    renderStepPendingMirror: (stepIndex: number, preferredSubtype?: string) => React.ReactNode;
    dismissedApprovedInlineForStep: number | null;
    setDismissedApprovedInlineForStep: React.Dispatch<React.SetStateAction<number | null>>;
    inlineFocusKey: string | null;
    pendingDecisionId: string | null;
    proceedsDone: boolean;
    openTrustDisburseForProceeds: () => void;
};
