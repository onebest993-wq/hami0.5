import { useMemo } from 'react';
import type { ExecutionFile, SeizedAsset } from '@/app/types/execution';
import { buildSalarySeizureTabRows } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import { requireDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';

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
                executionId: requireDecisionsStorageExecutionId({
                    decisionsStorageExecutionId,
                    executionId,
                    executionData: executionData as Record<string, unknown> | null,
                }),
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
