import { useMemo } from 'react';
import type { ExecutionFile, SeizedAsset } from '@/app/types/execution';
import { buildSalarySeizureTabRows } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';

export type UseExecutionDashboardSalarySeizureTabRowsParams = {
    salarySeizureRegistryAssets: SeizedAsset[];
    seizureDraftsByDecisionId: Record<string, SeizedAsset>;
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string | undefined;
    executionId: string | undefined;
};

export function useExecutionDashboardSalarySeizureTabRows({
    salarySeizureRegistryAssets,
    seizureDraftsByDecisionId,
    executionData,
    decisionsStorageExecutionId,
    executionId,
}: UseExecutionDashboardSalarySeizureTabRowsParams) {
    return useMemo(
        () =>
            buildSalarySeizureTabRows({
                registryAssets: salarySeizureRegistryAssets,
                seizureDraftsByDecisionId,
                executionData: executionData ?? null,
                executionId: String(decisionsStorageExecutionId ?? executionId ?? '').trim(),
            }),
        [
            salarySeizureRegistryAssets,
            seizureDraftsByDecisionId,
            executionData,
            decisionsStorageExecutionId,
            executionId,
        ],
    );
}
