import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { OpenFollowupModalPersistedFn } from '../../utils/followupModalOpen';

export type UseExecutionDashboardGuarantorFollowupHandlersParams = {
    decisionsStorageExecutionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    assignmentWorkspaceCtx: { activeDebtorKey: string | null | undefined };
    nextTimelineId: () => string;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    openGuarantorDetailsModal: () => void;
    openSeizureRequestsTabRef: MutableRefObject<(() => void) | null>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setShowCoerciveActionForm: Dispatch<SetStateAction<string | null>>;
    setSeizureDetailCompletion: Dispatch<SetStateAction<unknown>>;
    openFollowupModalPersisted?: OpenFollowupModalPersistedFn;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    setUnifiedModalTab: Dispatch<SetStateAction<string>>;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    guarantorDetailsDecisionId: string | null;
    setGuarantorDetailsDecisionId: Dispatch<SetStateAction<string | null>>;
};
