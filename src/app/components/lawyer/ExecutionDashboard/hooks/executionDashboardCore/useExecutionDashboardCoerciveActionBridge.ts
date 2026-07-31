import { useCallback, type MutableRefObject } from 'react';
import {
    clearActiveSalarySeizurePathStorage,
    clearSettlementFromLedgerStorage,
} from './executionDashboardSettlementLedger';
import {
    createSaveCoerciveAction,
    type SaveCoerciveActionDeps,
} from './executionDashboardCoerciveAction';
import { guardCreditorAgentMutation } from '@/app/components/lawyer/ExecutionDashboard/helpers/executionAgentPrivilege';

export type UseExecutionDashboardCoerciveActionBridgeParams = Omit<
    SaveCoerciveActionDeps,
    'clearSettlementFromLedger'
> & {
    saveCoerciveActionRef: MutableRefObject<(actionType: string, details: Record<string, string>) => void>;
    setUnifiedLedgerRevision: React.Dispatch<React.SetStateAction<number>>;
    isRepresentingDebtor?: boolean;
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
        isRepresentingDebtor = false,
        ...saveDeps
    } = params;

    const clearSettlementFromLedger = useCallback(() => {
        if (
            !guardCreditorAgentMutation({
                isRepresentingDebtor,
                showToast,
                actionLabel: 'إلغاء التسوية من السجل',
            })
        ) {
            return;
        }
        clearSettlementFromLedgerStorage(
            decisionsStorageExecutionId,
            executionId,
            setUnifiedLedgerRevision,
        );
    }, [
        decisionsStorageExecutionId,
        executionId,
        isRepresentingDebtor,
        setUnifiedLedgerRevision,
        showToast,
    ]);

    const clearActiveSalarySeizurePath = useCallback(() => {
        if (
            !guardCreditorAgentMutation({
                isRepresentingDebtor,
                showToast,
                actionLabel: 'إلغاء مسار حجز الراتب',
            })
        ) {
            return;
        }
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
        isRepresentingDebtor,
        persistExecutionMerge,
        seizedAssets,
        setSeizedAssets,
        setUnifiedLedgerRevision,
        showToast,
    ]);

    const saveCoerciveActionRaw = createSaveCoerciveAction({
        ...saveDeps,
        decisionsStorageExecutionId,
        executionId,
        seizedAssets,
        setSeizedAssets,
        persistExecutionMerge,
        showToast,
        clearSettlementFromLedger,
    });

    const saveCoerciveAction = useCallback(
        (
            actionType: string,
            details: Record<string, string>,
            opts?: { skipSettlementConflictCheck?: boolean },
        ) => {
            if (
                !guardCreditorAgentMutation({
                    isRepresentingDebtor,
                    showToast,
                    actionLabel: 'إجراءات الحجز/الإكراه',
                })
            ) {
                return;
            }
            return saveCoerciveActionRaw(actionType, details, opts);
        },
        [isRepresentingDebtor, saveCoerciveActionRaw, showToast],
    );

    saveCoerciveActionRef.current = saveCoerciveAction;

    return {
        saveCoerciveAction,
        clearSettlementFromLedger,
        clearActiveSalarySeizurePath,
    };
}
