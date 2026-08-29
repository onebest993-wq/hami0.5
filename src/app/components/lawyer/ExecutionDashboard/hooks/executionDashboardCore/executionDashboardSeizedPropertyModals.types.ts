import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, TimelineEvent } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';

export type SeizedEntityRow = SeizedMovable | SeizedProperty;

export type SaveSeizureMarkConfirmationDeps = {
    seizureMarkModalEntityId: string | null;
    seizureMarkModalEntityKind: 'property' | 'movable';
    seizureMarkLetterNumberDraft: string;
    seizureMarkDateDraft: string;
    seizureMarkEntityDraft: string;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    nextTimelineId: () => string;
    setSeizureMarkModalOpen: (open: boolean) => void;
    setSeizureMarkModalEntityId: (id: string | null) => void;
    setSeizureMarkLetterNumberDraft: (v: string) => void;
    setSeizureMarkDateDraft: (v: string) => void;
    setSeizureMarkEntityDraft: (v: string) => void;
    showToast: (message: string, type?: string) => void;
};

export type SaveSeizedPropertyStepDetailsDeps = {
    decisionsStorageExecutionId: string | undefined;
    seizedPropertyStepDecisionId: string | null;
    seizedPropertyStepEntityKind: 'property' | 'movable';
    seizedPropertyStepPropertyId: string | null;
    seizedPropertyStepKind: string | null;
    seizedPropertyExpertsNamesDraft: string;
    seizedPropertyExpertReportDateDraft: string;
    seizedPropertyExpertPriceDraft: string;
    seizedPropertyAuctionDateDraft: string;
    seizedPropertyBuyerNameDraft: string;
    seizedPropertyAwardAmountDraft: string;
    seizedPropertyStepNotesDraft: string;
    linkSeizureAuctionToAppointments: boolean;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    seizureMatrixLedgerParamsRef: MutableRefObject<UnifiedLedgerTotalParams | null>;
    setUnifiedLedgerRevision: Dispatch<SetStateAction<number>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    nextTimelineId: () => string;
    pushSeizureAuctionCalendarAppointment: (args: {
        dossierId: string;
        decisionId: string;
        ymd: string;
        purpose: string;
        linkToAppointments: boolean;
    }) => void;
    setSeizedPropertyStepModalOpen: (open: boolean) => void;
    setSeizedPropertyStepDecisionId: (id: string | null) => void;
    setSeizedPropertyStepPropertyId: (id: string | null) => void;
    setSeizedPropertyStepEntityKind: (kind: 'property' | 'movable') => void;
    setSeizedPropertyStepKind: (kind: string | null) => void;
    setSeizedPropertyExpertsNamesDraft: (v: string) => void;
    setSeizedPropertyExpertReportDateDraft: (v: string) => void;
    setSeizedPropertyExpertPriceDraft: (v: string) => void;
    setSeizedPropertyAuctionDateDraft: (v: string) => void;
    setSeizedPropertyBuyerNameDraft: (v: string) => void;
    setSeizedPropertyAwardAmountDraft: (v: string) => void;
    setSeizedPropertyStepNotesDraft: (v: string) => void;
    showToast: (message: string, type?: string) => void;
};

export type SavePublicationDetailsDeps = {
    publicationModalEntityId: string | null;
    publicationModalEntityKind: 'property' | 'movable';
    publicationNewspaperNameDraft: string;
    publicationDateYmdDraft: string;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    nextTimelineId: () => string;
    setPublicationModalOpen: (open: boolean) => void;
    setPublicationModalEntityId: (id: string | null) => void;
    setPublicationNewspaperNameDraft: (v: string) => void;
    setPublicationDateYmdDraft: (v: string) => void;
    showToast: (message: string, type?: string) => void;
};
