import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, SeizedAsset } from '@/app/types/execution';
import type { SalarySeizureDetailsPatch } from '@/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard';
import { applySalarySeizureAssetDetailsPatch } from './executionDashboardSalarySeizurePatch';

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
            const nextAssets = applySalarySeizureAssetDetailsPatch(
                seizedAssets,
                assetId,
                patch,
                {
                    activeDebtorIsDeceased,
                    executionData,
                    storageExecutionId:
                        String(decisionsStorageExecutionId ?? executionId ?? '').trim() || undefined,
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
