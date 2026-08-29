import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export type UseExecutionDashboardEmployeeAssignmentHandlersParams = {
    executionData: ExecutionFile | null | undefined;
    unifiedSummonsTargetDebtorKey: string;
    primaryDebtorKeyResolved: string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    forcedBringDecisionState: { approved: boolean; pending: boolean };
    employeeForcedBringAwaitingPersonalOutcome: boolean;
};

