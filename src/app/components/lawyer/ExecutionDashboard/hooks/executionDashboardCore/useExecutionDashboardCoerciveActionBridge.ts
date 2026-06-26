import { useCallback, type MutableRefObject } from 'react';
import {
    clearActiveSalarySeizurePathStorage,
    clearSettlementFromLedgerStorage,
} from './executionDashboardSettlementLedger';
import {
    createSaveCoerciveAction,
    type SaveCoerciveActionDeps,
} from './executionDashboardCoerciveAction';

export type UseExecutionDashboardCoerciveActionBridgeParams = Omit<
    SaveCoerciveActionDeps,
    'clearSettlementFromLedger'
> & {
    saveCoerciveActionRef: MutableRefObject<(actionType: string, details: Record<string, string>) => void>;
    setUnifiedLedgerRevision: React.Dispatch<React.SetStateAction<number>>;
};

export function useExecutionDashboardCoerciveActionBridge(
    params: UseExecutionDashboardCoerciveActionBridgeParams,
) {
    const {
        saveCoerciveActionRef,
        decisionsStorageExecutionId,
        executionId,
        setUnifiedLedgerRevision,
        seizedAssets,
        setSeizedAssets,
        persistExecutionMerge,
        showToast,
        ...saveDeps
    } = params;

    const clearSettlementFromLedger = useCallback(() => {
        clearSettlementFromLedgerStorage(
            decisionsStorageExecutionId,
            executionId,
            setUnifiedLedgerRevision,
        );
    }, [decisionsStorageExecutionId, executionId, setUnifiedLedgerRevision]);

    const clearActiveSalarySeizurePath = useCallback(() => {
        clearActiveSalarySeizurePathStorage({
            decisionsStorageExecutionId,
            executionId,
            seizedAssets,
            setSeizedAssets,
            persistExecutionMerge,
            setUnifiedLedgerRevision,
        });
        showToast('تم إلغاء مسار حجز الراتب — يُتابَع التسوية فقط.', 'info');
    }, [
        decisionsStorageExecutionId,
        executionId,
        persistExecutionMerge,
        seizedAssets,
        setSeizedAssets,
        setUnifiedLedgerRevision,
        showToast,
    ]);

    const saveCoerciveAction = createSaveCoerciveAction({
        ...saveDeps,
        decisionsStorageExecutionId,
        executionId,
        seizedAssets,
        setSeizedAssets,
        persistExecutionMerge,
        showToast,
        clearSettlementFromLedger,
    });

    saveCoerciveActionRef.current = saveCoerciveAction;

    return {
        saveCoerciveAction,
        clearSettlementFromLedger,
        clearActiveSalarySeizurePath,
    };
}
