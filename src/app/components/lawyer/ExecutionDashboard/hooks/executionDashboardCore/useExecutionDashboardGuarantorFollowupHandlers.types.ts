import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { FollowupUnifiedModalTab } from '../../followupModalTabTypes';
import type { OpenFollowupModalPersistedFn } from '../../utils/followupModalOpen';
import type { SeizureDetailCompletionState } from '../../utils/seizureDetailCompletion.types';

export type UseExecutionDashboardGuarantorFollowupHandlersParams = {
    decisionsStorageExecutionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    assignmentWorkspaceCtx: { activeDebtorKey: string | null | undefined };
    nextTimelineId: () => string;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: unknown,
    ) => void;
    openGuarantorDetailsModal: () => void;
    openSeizureRequestsTabRef: MutableRefObject<(() => void) | null>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setShowCoerciveActionForm: Dispatch<SetStateAction<string | null>>;
    setSeizureDetailCompletion: Dispatch<SetStateAction<SeizureDetailCompletionState | null>>;
    openFollowupModalPersisted?: OpenFollowupModalPersistedFn;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    setUnifiedModalTab: Dispatch<SetStateAction<FollowupUnifiedModalTab>>;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    guarantorDetailsDecisionId: string | null;
    setGuarantorDetailsDecisionId: Dispatch<SetStateAction<string | null>>;
};
