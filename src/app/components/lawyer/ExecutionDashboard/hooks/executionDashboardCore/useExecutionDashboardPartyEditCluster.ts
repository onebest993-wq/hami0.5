import type { MutableRefObject } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { usePartyEditWorkflow } from '../usePartyEditWorkflow';

type ShowToast = (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
) => void;

export type ExecutionDashboardPartyEditClusterInput = {
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null>;
    decisionsStorageExecutionId: string;
    isHistoricalMode: boolean;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: ShowToast;
};

export function useExecutionDashboardPartyEditCluster(
    input: ExecutionDashboardPartyEditClusterInput,
) {
    const partyEditWorkflow = usePartyEditWorkflow({
        executionData: input.executionData,
        viewExecutionData: input.viewExecutionData,
        executionDataRef: input.executionDataRef,
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        isHistoricalMode: input.isHistoricalMode,
        persistExecutionMerge: input.persistExecutionMerge,
        showToast: input.showToast,
    });

    return {
        partyEditWorkflow,
        ...partyEditWorkflow,
    };
}
