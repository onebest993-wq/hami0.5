import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, SeizedAsset } from '@/app/types/execution';
import type { SalarySeizureDetailsPatch } from '@/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard';
import { coalesceDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import { applySalarySeizureAssetDetailsPatch } from './executionDashboardSalarySeizurePatch';
import { mergeSeizedAssetLists } from '@/app/components/lawyer/ExecutionDashboard/utils/executionPhoneBodyExecutionDataMerge';

function readSeizedAssetsForSalaryPatch(
    seizedAssets: SeizedAsset[],
    executionData: ExecutionFile | null | undefined,
): SeizedAsset[] {
    const fromFile = Array.isArray(executionData?.seizedAssets)
        ? (executionData.seizedAssets as SeizedAsset[])
        : [];
    return mergeSeizedAssetLists(fromFile, seizedAssets);
}

export type UseExecutionDashboardSalarySeizurePatchParams = {
    seizedAssets: SeizedAsset[];
    setSeizedAssets: Dispatch<SetStateAction<SeizedAsset[]>>;
    activeDebtorIsDeceased: boolean;
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string | undefined;
    executionId: string | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
};

export function useExecutionDashboardSalarySeizurePatch({
    seizedAssets,
    setSeizedAssets,
    activeDebtorIsDeceased,
    executionData,
    decisionsStorageExecutionId,
    executionId,
    persistExecutionMerge,
}: UseExecutionDashboardSalarySeizurePatchParams) {
    const patchSalarySeizureAssetDetails = useCallback(
        (assetId: string, patch: SalarySeizureDetailsPatch) => {
            const mergedAssets = readSeizedAssetsForSalaryPatch(seizedAssets, executionData);
            const nextAssets = applySalarySeizureAssetDetailsPatch(
                mergedAssets,
                assetId,
                patch,
                {
                    activeDebtorIsDeceased,
                    executionData,
                    storageExecutionId: coalesceDecisionsStorageExecutionId({
                        decisionsStorageExecutionId,
                        executionId,
                        executionData: executionData as Record<string, unknown> | null,
                    }),
                },
            );
            setSeizedAssets(nextAssets);
            persistExecutionMerge({ seizedAssets: nextAssets });
        },
        [
            activeDebtorIsDeceased,
            decisionsStorageExecutionId,
            executionData,
            executionId,
            persistExecutionMerge,
            seizedAssets,
            setSeizedAssets,
        ],
    );

    return { patchSalarySeizureAssetDetails };
}
