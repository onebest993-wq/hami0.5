/** W3 — كتلة سجل الحجز الموحّد (تُثبَّت في execution-seizure-log-hooks) */
import type { ExecutionFile } from '@/app/types/execution';
import { useSeizureLogEntityData } from '../useSeizureLogEntityData';
import { useUnifiedSeizureLog } from '../useUnifiedSeizureLog';

type UnifiedSeizureLogInput = Parameters<typeof useUnifiedSeizureLog>[0];

export type UseExecutionDashboardSeizureLogClusterInput = {
    viewExecutionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
    executionId: string | undefined;
    activeDebtorIsDeceased: boolean;
    realEstateSeizureRegistryAssets: UnifiedSeizureLogInput['realEstateSeizureRegistryAssets'];
    salarySeizureRegistryAssets: UnifiedSeizureLogInput['salarySeizureRegistryAssets'];
    movableSeizureRegistryAssets: UnifiedSeizureLogInput['movableSeizureRegistryAssets'];
    thirdPartySeizureRegistryAssets: UnifiedSeizureLogInput['thirdPartySeizureRegistryAssets'];
    thirdPartySeizuresUi: UnifiedSeizureLogInput['thirdPartySeizuresUi'];
    showToast: (msg: string, type?: string) => void;
};

export function useExecutionDashboardSeizureLogCluster(
    p: UseExecutionDashboardSeizureLogClusterInput,
) {
    const { seizedPropertiesForSeizureLog, seizedMovablesForSeizureLog, seizureLogExecutorDecisions } =
        useSeizureLogEntityData({
            viewExecutionData: p.viewExecutionData,
            decisionsStorageExecutionId: p.decisionsStorageExecutionId,
            decisionsReloadEpoch: p.decisionsReloadEpoch,
        });

    const unifiedSeizureLog = useUnifiedSeizureLog({
        viewExecutionData: p.viewExecutionData,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        executionId: p.executionId,
        activeDebtorIsDeceased: p.activeDebtorIsDeceased,
        realEstateSeizureRegistryAssets: p.realEstateSeizureRegistryAssets,
        salarySeizureRegistryAssets: p.salarySeizureRegistryAssets,
        movableSeizureRegistryAssets: p.movableSeizureRegistryAssets,
        seizedMovablesForSeizureLog,
        thirdPartySeizureRegistryAssets: p.thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi: p.thirdPartySeizuresUi,
        decisionsReloadEpoch: p.decisionsReloadEpoch,
        showToast: p.showToast,
    });

    return {
        seizedPropertiesForSeizureLog,
        seizedMovablesForSeizureLog,
        seizureLogExecutorDecisions,
        unifiedSeizureLog,
        ...unifiedSeizureLog,
    };
}
