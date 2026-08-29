import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { Creditor, Debtor, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';

export type PartyDeathSaveDeps = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    executionData: ExecutionFile | null | undefined;
    claimType: string | undefined;
    creditors: Creditor[];
    debtors: Debtor[];
    decisionsStorageExecutionId: string;
    partyDeathModalDecisionId: string | null;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    patchExecutorDecisionRow: typeof patchExecutorDecisionRow;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
};

