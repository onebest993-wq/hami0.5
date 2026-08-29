import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { OpenFollowupModalPersistedFn } from '../../utils/followupModalOpen';

export type UseExecutionDashboardEvictionResidentialGraceHandlersParams = {
    graceModalAllowResave: boolean;
    residentialGracePeriodSaved: boolean;
    evictionProcedureLocked: boolean;
    evictionVacateDeadlineLocal: string | null | undefined;
    evictionVacateDraft: string;
    evictionResidentialGracePeriodStart: string | null | undefined;
    graceModalStartYmd: string;
    graceModalEndYmd: string;
    isResidentialVacateGraceFinished: boolean;
    residentialVacateDeadlineMaxIso: string | null | undefined;
    timelineEvents: TimelineEvent[];
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    caseTasksPendingRef: MutableRefObject<Array<{ id: string; title?: string; body?: string }>>;
    decisionsStorageExecutionId: string | undefined;
    executionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    file: ExecutionFile | null | undefined;
    currentFileId: string;
    evictionGraceDecisionId: string | null;
    executorApprovalActions: Record<string, (...args: unknown[]) => unknown>;
    openBreakInventoryCompletion: (
        decisionId: string,
        actions: Record<string, unknown>,
        requestTitle: string,
    ) => void;
    openJudicialCustodianCompletion: (
        decisionId: string,
        actions: Record<string, unknown>,
        requestTitle: string,
    ) => void;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setGraceModalEndYmd: Dispatch<SetStateAction<string>>;
    setGraceModalStartYmd: Dispatch<SetStateAction<string>>;
    setGraceModalAllowResave: Dispatch<SetStateAction<boolean>>;
    setShowEvictionResidentialGraceModal: (show: boolean) => void;
    setEvictionGraceDecisionId: Dispatch<SetStateAction<string | null>>;
    setEvictionVacateDeadlineLocal: Dispatch<SetStateAction<string>>;
    setEvictionVacateDraft: Dispatch<SetStateAction<string>>;
    setEvictionResidentialGracePeriodStart: Dispatch<SetStateAction<string | null>>;
    setEvictionExecutorVacateGrantApproved: Dispatch<SetStateAction<boolean>>;
    setEvictionResidentialGraceManuallyEndedAt: Dispatch<SetStateAction<string | null>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setCaseTasksPending: Dispatch<SetStateAction<Array<{ id: string; title?: string; body?: string }>>>;
    setShowDecisionsModal: (show: boolean) => void;
    setDecisionsModalBootListTab: Dispatch<SetStateAction<string>>;
    setDecisionsModalScrollToDecisionId: Dispatch<SetStateAction<string | null>>;
    setPoliceAssistanceDecisionId: Dispatch<SetStateAction<string | null>>;
    setPoliceAssistanceRequestTitle: Dispatch<SetStateAction<string>>;
    setPoliceAssistanceAgencyDraft: Dispatch<SetStateAction<string>>;
    setPoliceAssistanceModalOpen: (open: boolean) => void;
    openFollowupModalPersisted?: OpenFollowupModalPersistedFn;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    setUnifiedModalTab: Dispatch<SetStateAction<string>>;
};
